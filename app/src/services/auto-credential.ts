import { AbstractBifoldLogger, CredentialProvisioningEventTypes, CredentialProvisioningMonitor } from '@bifold/core'
import { AnonCredsRequestedAttribute, AnonCredsRequestedPredicate } from '@credo-ts/anoncreds'
import { Agent } from '@credo-ts/core'
import {
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

interface ProofRequestFormat {
  requested_attributes?: Record<string, AnonCredsRequestedAttribute>
  requested_predicates?: Record<string, AnonCredsRequestedPredicate>
}

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
 *
 * TODO: (al) This currently logs any results of a rule triggering, implement full workflow when target credential is ready
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
   *
   * For example:
   * Rule: CredDefId: A
   * Proof request received: request credential with CredDefId A
   * Wallet: No Credential with CredDefId A
   *
   * Proof request triggers the rule AND credential is missing, return true to trigger a workflow
   */
  private async isCredentialMissingForRule(
    proofId: string,
    proofFormat: ProofRequestFormat,
    rule: AutoCredentialRule
  ): Promise<boolean> {
    if (!this.agent) {
      return false
    }

    // Step 1: does the proof's restrictions reference any of our trigger cred def IDs?
    const triggeredAttributeKeys = new Set<string>()
    const triggeredPredicateKeys = new Set<string>()

    for (const [key, attr] of Object.entries(proofFormat.requested_attributes ?? {})) {
      if ((attr.restrictions ?? []).some((r) => r.cred_def_id && rule.triggerCredDefIds.includes(r.cred_def_id))) {
        triggeredAttributeKeys.add(key)
      }
    }
    for (const [key, pred] of Object.entries(proofFormat.requested_predicates ?? {})) {
      if ((pred.restrictions ?? []).some((r) => r.cred_def_id && rule.triggerCredDefIds.includes(r.cred_def_id))) {
        triggeredPredicateKeys.add(key)
      }
    }

    if (triggeredAttributeKeys.size === 0 && triggeredPredicateKeys.size === 0) {
      return false // this rule doesn't match this proof
    }

    // Step 2: does the wallet have credentials to satisfy those specific attributes?
    try {
      const credentials = await credentialsMatchForProof(this.agent, proofId)
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
      this.log?.warn(`[AutoCredentialMonitor] Could not determine credential availability, assuming missing`, {
        error: err as Error,
      })
      return true
    }
  }

  // ---------------------------------------------------------------------------
  // Private — event handler
  // ---------------------------------------------------------------------------

  private readonly handleProofStateChanged = async (event: DidCommProofStateChangedEvent): Promise<void> => {
    if (!this.agent) {
      return
    }
    const proof = event.payload.proofRecord
    if (proof.state !== DidCommProofState.RequestReceived) {
      return
    }

    this.log?.info(`[AutoCredentialMonitor] Checking if proof request matches any rules`)

    // fetch and construct proof request format
    const format = await this.agent.didcomm.proofs.getFormatData(proof.id)
    const requestFormat = (format.request?.anoncreds ?? format.request?.indy) as ProofRequestFormat | undefined

    if (!requestFormat) {
      // no proof format, nothing to check against
      return
    }

    // collect and flatten proof request restrictions
    const restrictions = [
      ...Object.values(requestFormat.requested_attributes ?? {}).flatMap((attributes) => attributes.restrictions ?? []),
      ...Object.values(requestFormat.requested_predicates ?? {}).flatMap((predicates) => predicates.restrictions ?? []),
    ]

    for (const rule of this.rules) {
      // compare the cred def id against the rule trigger IDs, if any match then this proof is requesting a credential that would trigger the workflow
      const proofRequestsWatchedCredential = restrictions.some(
        (restriction) => restriction.cred_def_id && rule.triggerCredDefIds.includes(restriction.cred_def_id)
      )

      this.log?.info(
        `[AutoCredentialMonitor] Proof ${proof.id} requests credential(s) that match rule trigger IDs: ${proofRequestsWatchedCredential}`
      )
      if (!proofRequestsWatchedCredential) {
        continue
      }

      try {
        const isMissing = await this.isCredentialMissingForRule(proof.id, requestFormat, rule)
        // TODO: if isMissing == true, trigger workflow to fetch missing credential and respond to proof request
        this.log?.info(
          `[AutoCredentialMonitor] Credential (${rule.triggerCredDefIds.join(', ')}) is ${isMissing ? 'NOT ' : ''}in the wallet`
        )
      } catch (err) {
        this.log?.warn(`[AutoCredentialMonitor] Could not check credential availability`, { error: err as Error })
      }
    }
  }
}
