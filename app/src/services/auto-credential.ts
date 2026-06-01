import { getErrorDefinition } from '@/errors'
import {
  AbstractBifoldLogger,
  BifoldError,
  CredentialProvisioningEventTypes,
  CredentialProvisioningMonitor,
  removeExistingInvitationsById,
} from '@bifold/core'
import { Agent } from '@credo-ts/core'
import {
  DidCommConnectionRecord,
  DidCommProofEventTypes,
  DidCommProofExchangeRecord,
  DidCommProofState,
  DidCommProofStateChangedEvent,
} from '@credo-ts/didcomm'
import { BCAgent } from '@utils/bc-agent-modules'
import { credentialsMatchForProof } from '@utils/credentials'
import { DeviceEventEmitter } from 'react-native'

// subscription type from agent events
type AgentSubscription = ReturnType<ReturnType<Agent['events']['observable']>['subscribe']>

const ErrorCodes = {
  BadInvitation: getErrorDefinition('AUTO_CRED_BAD_INVITATION').statusCode,
  ConnectionError: getErrorDefinition('AUTO_CRED_CONNECTION_ERROR').statusCode,
  ProofError: getErrorDefinition('AUTO_CRED_PROOF_ERROR').statusCode,
  OfferError: getErrorDefinition('AUTO_CRED_OFFER_ERROR').statusCode,
  GeneralError: getErrorDefinition('AUTO_CRED_GENERAL_ERROR').statusCode,
} as const

/**
 * Configuration for a single just-in-time credential acquisition rule
 */
export interface AutoCredentialRule {
  /** Cred def IDs whose absence in the wallet triggers this rule. */
  triggerCredDefIds: string[]

  /**
   * Returns the OOB invitation URL for the issuer that can provide the missing
   * credential.  Receives the triggering proof so the URL can optionally be
   * derived from the proof's restrictions (e.g. matching issuer DID), or it can
   * simply return a static value from config.
   */
  getInvitationUrl: (proof: DidCommProofExchangeRecord, agent: BCAgent) => Promise<string>

  /**
   * When the issuer sends a proof request back to the wallet (to verify
   * eligibility), auto-present using the best available credential.
   * Defaults to true — set false only if the issuer skips this step.
   */
  autoAcceptIssuerProofRequest?: boolean

  /**
   * Auto-accept the credential offer from the issuer once the proof is
   * presented.  Defaults to true.
   */
  autoAcceptCredentialOffer?: boolean
}

export interface AutoCredentialMonitorOptions {
  rules: AutoCredentialRule[]
}

/**
 * Monitors incoming proof requests and automatically provisions any missing
 * credentials by connecting to the appropriate issuer, presenting an
 * eligibility proof, and accepting the resulting credential offer — all
 * without user interaction.
 *
 * Once the credential is in the wallet the monitor emits
 * CredentialProvisioningEventTypes.Completed so the ProofRequest screen can
 * refresh and allow the user to approve the original request.
 *
 * Register an instance at TOKENS.UTIL_CREDENTIAL_PROVISIONING_MONITOR
 */
export class AutoCredentialMonitor implements CredentialProvisioningMonitor {
  private proofSubscription?: AgentSubscription
  private credentialSubscription?: AgentSubscription
  private agent?: BCAgent
  private log?: AbstractBifoldLogger
  private rules: AutoCredentialRule[]

  // State for the active workflow (one at a time)
  private _workflowInProgress = false
  private _pendingProofRequest?: DidCommProofExchangeRecord
  private _pendingConnectionId?: string
  private _activeRule?: AutoCredentialRule

  public constructor(logger: AbstractBifoldLogger, options: AutoCredentialMonitorOptions) {
    this.log = logger
    this.rules = options.rules
  }

  public get workflowInProgress(): boolean {
    return this._workflowInProgress
  }

  public start(agent: Agent): void {
    this.agent = agent as BCAgent

    this.proofSubscription = this.agent.events
      .observable<DidCommProofStateChangedEvent>(DidCommProofEventTypes.ProofStateChanged)
      .subscribe(this.handleProofStateChanged)
  }

  public stop(): void {
    this.proofSubscription?.unsubscribe()
    this.credentialSubscription?.unsubscribe()
    this._workflowInProgress = false
    this._pendingProofRequest = undefined
    this._pendingConnectionId = undefined
    this._activeRule = undefined
  }

  // ---------------------------------------------------------------------------
  // Private — state machine helpers
  // ---------------------------------------------------------------------------

  private startWorkflow(proof: DidCommProofExchangeRecord, rule: AutoCredentialRule): void {
    this._workflowInProgress = true
    this._pendingProofRequest = proof
    this._activeRule = rule
    DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Started)
    this.log?.info('[AutoCredentialMonitor] Workflow started')
  }

  private completeWorkflow(): void {
    this._workflowInProgress = false
    this._pendingProofRequest = undefined
    this._pendingConnectionId = undefined
    this._activeRule = undefined
    DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Completed)
    this.log?.info('[AutoCredentialMonitor] Workflow completed')
  }

  private failWorkflow(
    eventType:
      | typeof CredentialProvisioningEventTypes.FailedHandleOffer
      | typeof CredentialProvisioningEventTypes.FailedHandleProof
      | typeof CredentialProvisioningEventTypes.FailedRequestCredential,
    error: Error
  ): void {
    this._workflowInProgress = false
    this._pendingProofRequest = undefined
    this._pendingConnectionId = undefined
    this._activeRule = undefined
    DeviceEventEmitter.emit(eventType, error)
    this.log?.error('[AutoCredentialMonitor] Workflow failed', error)
  }

  // ---------------------------------------------------------------------------
  // Private — credential check
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the proof requests one of the rule's trigger cred def IDs
   * AND the wallet has no credential that satisfies it.
   */
  private async isCredentialMissingForRule(
    proof: DidCommProofExchangeRecord,
    rule: AutoCredentialRule
  ): Promise<boolean> {
    if (!this.agent) {
      return false
    }

    // Step 1: does the proof's restrictions reference any of our trigger cred def IDs?
    const format = await this.agent.didcomm.proofs.getFormatData(proof.id)
    const requestFormat = (format.request?.anoncreds ?? format.request?.indy) as
      | {
          requested_attributes?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
          requested_predicates?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
        }
      | undefined

    if (!requestFormat) {
      return false
    }

    const triggeredAttributeKeys = new Set<string>()
    const triggeredPredicateKeys = new Set<string>()

    for (const [key, attr] of Object.entries(requestFormat.requested_attributes ?? {})) {
      if ((attr.restrictions ?? []).some((r) => r.cred_def_id && rule.triggerCredDefIds.includes(r.cred_def_id))) {
        triggeredAttributeKeys.add(key)
      }
    }
    for (const [key, pred] of Object.entries(requestFormat.requested_predicates ?? {})) {
      if ((pred.restrictions ?? []).some((r) => r.cred_def_id && rule.triggerCredDefIds.includes(r.cred_def_id))) {
        triggeredPredicateKeys.add(key)
      }
    }

    if (triggeredAttributeKeys.size === 0 && triggeredPredicateKeys.size === 0) {
      return false // this rule doesn't match this proof
    }

    // Step 2: does the wallet have credentials to satisfy those specific attributes?
    try {
      const credentials = await credentialsMatchForProof(this.agent, proof)
      const matchedFormat = credentials.proofFormats.anoncreds ?? credentials.proofFormats.indy

      if (!matchedFormat) {
        return true
      }

      const attrMatches = (matchedFormat as any).attributes ?? {}
      const predMatches = (matchedFormat as any).predicates ?? {}

      for (const key of triggeredAttributeKeys) {
        if (!attrMatches[key] || attrMatches[key].length === 0) {
          this.log?.info(`[AutoCredentialMonitor] Missing credential for attribute group "${key}"`)
          return true
        }
      }
      for (const key of triggeredPredicateKeys) {
        if (!predMatches[key] || predMatches[key].length === 0) {
          this.log?.info(`[AutoCredentialMonitor] Missing credential for predicate group "${key}"`)
          return true
        }
      }
      return false
    } catch (err) {
      this.log?.warn('[AutoCredentialMonitor] Could not determine credential availability, assuming missing')
      return true
    }
  }

  // ---------------------------------------------------------------------------
  // Private — connection
  // ---------------------------------------------------------------------------

  private async connectToIssuer(invitationUrl: string): Promise<DidCommConnectionRecord | undefined> {
    if (!this.agent) {
      return undefined
    }

    const invite = await this.agent.didcomm.oob.parseInvitation(invitationUrl)
    if (!invite) {
      throw new BifoldError(
        'Auto Credential',
        'Could not parse the credential issuer invitation.',
        'The invitation URL is malformed or unsupported.',
        ErrorCodes.BadInvitation
      )
    }

    this.log?.info('[AutoCredentialMonitor] Removing any duplicate invitations')
    await removeExistingInvitationsById(this.agent as Agent, invite.id)

    this.log?.info('[AutoCredentialMonitor] Receiving invitation from issuer')
    const { connectionRecord } = await this.agent.didcomm.oob.receiveInvitation(invite, {
      label: 'Credential Issuer',
    })

    if (!connectionRecord) {
      throw new BifoldError(
        'Auto Credential',
        'Failed to connect to the credential issuer.',
        'No connection record was returned after receiving the invitation.',
        ErrorCodes.ConnectionError
      )
    }

    return await this.agent.didcomm.connections.returnWhenIsConnected(connectionRecord.id)
  }

  // ---------------------------------------------------------------------------
  // Private — event handlers (arrow functions keep `this` bound)
  // ---------------------------------------------------------------------------

  private readonly handleProofStateChanged = async (event: DidCommProofStateChangedEvent): Promise<void> => {
    this.log?.info(
      `[AutoCredentialMonitor] Proof state changed: ${event.payload.proofRecord.id} is now ${event.payload.proofRecord.state}`
    )
    if (!this.agent) {
      return
    }
    this.log?.info(`[AutoCredentialMonitor] Checking if proof request matches any rules`)
    const proof = event.payload.proofRecord
    if (proof.state !== DidCommProofState.RequestReceived) {
      return
    }
    this.log?.info(`AutoCredentialMonitor] made it here`)
    for (const rule of this.rules) {
      const format = await this.agent.didcomm.proofs.getFormatData(proof.id)
      const requestFormat = (format.request?.anoncreds ?? format.request?.indy) as
        | {
            requested_attributes?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
            requested_predicates?: Record<string, { restrictions?: { cred_def_id?: string }[] }>
          }
        | undefined

      this.log?.info(`[AutoCredentialMonitor] request format for proof ${proof.id}: ${JSON.stringify(requestFormat)}`)
      if (!requestFormat) {
        continue
      }

      const proofRequestsWatchedCredential = [
        ...Object.values(requestFormat.requested_attributes ?? {}).flatMap(
          (attributes) => attributes.restrictions ?? []
        ),
        ...Object.values(requestFormat.requested_predicates ?? {}).flatMap(
          (predicates) => predicates.restrictions ?? []
        ),
      ].some((r) => r.cred_def_id && rule.triggerCredDefIds.includes(r.cred_def_id))

      this.log?.info(
        `[AutoCredentialMonitor] Proof ${proof.id} requests credential(s) that match rule trigger IDs: ${proofRequestsWatchedCredential}`
      )
      if (!proofRequestsWatchedCredential) {
        continue
      }

      try {
        const isMissing = await this.isCredentialMissingForRule(proof, rule)
        this.log?.info(
          `[AutoCredentialMonitor] Credential (${rule.triggerCredDefIds.join(', ')}) is ${isMissing ? 'NOT ' : ''}in the wallet`
        )
      } catch (err) {
        this.log?.warn(`[AutoCredentialMonitor] Could not check credential availability: ${err}`)
      }
    }
  }
}
