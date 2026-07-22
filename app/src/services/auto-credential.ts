import { AbstractBifoldLogger, CredentialProvisioningEventTypes, CredentialProvisioningMonitor } from '@bifold/core'
import { AnonCredsRequestedAttribute, AnonCredsRequestedPredicate } from '@credo-ts/anoncreds'
import { Agent } from '@credo-ts/core'
import {
  DidCommCredentialEventTypes,
  DidCommCredentialState,
  DidCommCredentialStateChangedEvent,
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

/** Minimal shape of the always-on AttestationMonitor we need to pause. */
interface PausableAttestationMonitor {
  start: (agent: Agent) => void
  stop: () => void
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
  /**
   * Always-on AttestationMonitor. Paused for the duration of an auto-workflow
   * so it can't race our filtered subscription trying to satisfy the (now
   * optional) attestation proof the issuer sends during issuance.
   */
  attestationMonitor?: PausableAttestationMonitor
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
  private agent?: BCAgent
  private readonly log?: AbstractBifoldLogger
  private readonly rules: AutoCredentialRule[]
  private readonly attestationMonitor?: PausableAttestationMonitor

  // State for the active workflow (one at a time)
  private _workflowInProgress = false
  private _pendingProofRequest?: DidCommProofExchangeRecord
  private _pendingConnectionId?: string
  private _activeRule?: AutoCredentialRule
  private _workflowProofSubscription?: AgentSubscription
  private _workflowOfferSubscription?: AgentSubscription

  public constructor(logger: AbstractBifoldLogger, options: AutoCredentialMonitorOptions) {
    this.log = logger
    this.rules = options.rules
    this.attestationMonitor = options.attestationMonitor
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
    this.teardownWorkflowSubscriptions()
    this._workflowInProgress = false
    this._pendingProofRequest = undefined
    this._pendingConnectionId = undefined
    this._activeRule = undefined
  }

  /**
   * Manually starts the first configured rule's workflow, bypassing the normal
   * "proof request references a missing cred def" trigger. Intended for the
   * Developer settings test button so the JIT credential fetch can be exercised
   * without waiting for a real proof request.
   *
   * Passes a stub proof record — safe only because no configured rule's
   * `getInvitationUrl` reads its `proof` argument today (the DigitalServicesCard
   * rule ignores it entirely). If a future rule derives its invitation from proof
   * restrictions, this method will need a real proof to test that rule.
   */
  public triggerTestWorkflow(): boolean {
    if (this._workflowInProgress) {
      this.log?.warn('[AutoCredentialMonitor] triggerTestWorkflow: workflow already in progress')
      return false
    }
    if (!this.agent) {
      this.log?.warn('[AutoCredentialMonitor] triggerTestWorkflow: agent not ready')
      return false
    }
    const rule = this.rules[0]
    if (!rule) {
      this.log?.warn('[AutoCredentialMonitor] triggerTestWorkflow: no rules configured')
      return false
    }
    this.log?.info('[AutoCredentialMonitor] triggerTestWorkflow: manually starting workflow')
    this.runWorkflow(rule, {} as DidCommProofExchangeRecord)
    return true
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
    this.teardownWorkflowSubscriptions()
    this.resumeAttestationMonitor()
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
    this.teardownWorkflowSubscriptions()
    this.resumeAttestationMonitor()
    this._workflowInProgress = false
    this._pendingProofRequest = undefined
    this._pendingConnectionId = undefined
    this._activeRule = undefined
    DeviceEventEmitter.emit(eventType, error)
    this.log?.error('[AutoCredentialMonitor] Workflow failed', error)
  }

  private teardownWorkflowSubscriptions(): void {
    this._workflowProofSubscription?.unsubscribe()
    this._workflowProofSubscription = undefined
    this._workflowOfferSubscription?.unsubscribe()
    this._workflowOfferSubscription = undefined
  }

  private resumeAttestationMonitor(): void {
    if (this.attestationMonitor && this.agent) {
      try {
        this.attestationMonitor.start(this.agent)
      } catch (err) {
        this.log?.warn('[AutoCredentialMonitor] Could not restart AttestationMonitor', { error: err as Error })
      }
    }
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
  // Private — workflow driver
  // ---------------------------------------------------------------------------

  /**
   * Fetch the missing credential:
   *   1. Pause the always-on AttestationMonitor.
   *   2. Get the issuer invitation URL from the rule (BCSC-initiated: POST
   *      /credentials/v1/person; static: literal from config).
   *   3. Receive the invitation. The didexchange connection completes async.
   *   4. On any proof request the issuer sends over the new connection,
   *      decline it (attestation is optional server-side).
   *   5. On credential offer, auto-accept; on credential done, complete.
   *
   * The original triggering proof request is left in `RequestReceived` state
   * so the user can approve it manually once the missing cred lands.
   */
  private async runWorkflow(rule: AutoCredentialRule, proof: DidCommProofExchangeRecord): Promise<void> {
    if (!this.agent) {
      return
    }

    this.startWorkflow(proof, rule)
    this.attestationMonitor?.stop()

    try {
      const invitationUrl = await rule.getInvitationUrl(proof, this.agent)
      const invite = await this.agent.didcomm.oob.parseInvitation(invitationUrl)
      if (!invite) {
        throw new Error('Could not parse issuer invitation')
      }
      const { connectionRecord } = await this.agent.didcomm.oob.receiveInvitation(invite, {
        label: 'Person Credential Issuer',
      })
      if (!connectionRecord) {
        throw new Error('No connection record returned from receiveInvitation')
      }
      const connectionId = connectionRecord.id
      this._pendingConnectionId = connectionId

      // Decline any proof the issuer sends on this connection. In the BCSC flow
      // the issuer sends an (optional) attestation proof request that we can't
      // satisfy from the wallet; declining lets the issuance proceed to the
      // credential offer.
      this._workflowProofSubscription = this.agent.events
        .observable<DidCommProofStateChangedEvent>(DidCommProofEventTypes.ProofStateChanged)
        .subscribe(async ({ payload: { proofRecord } }) => {
          if (!this.agent) {
            return
          }

          if (proofRecord.connectionId !== connectionId) {
            return
          }

          if (proofRecord.state !== DidCommProofState.RequestReceived) {
            return
          }

          try {
            await this.agent.didcomm.proofs.declineRequest({
              proofExchangeRecordId: proofRecord.id,
              sendProblemReport: true,
            })
          } catch (err) {
            this.failWorkflow(CredentialProvisioningEventTypes.FailedHandleProof, err as Error)
          }
        })

      // Auto-accept the Person Credential offer and complete when it lands.
      this._workflowOfferSubscription = this.agent.events
        .observable<DidCommCredentialStateChangedEvent>(DidCommCredentialEventTypes.DidCommCredentialStateChanged)
        .subscribe(async ({ payload: { credentialExchangeRecord } }) => {
          if (!this.agent) {
            return
          }

          if (credentialExchangeRecord.connectionId !== connectionId) {
            return
          }

          try {
            if (
              credentialExchangeRecord.state === DidCommCredentialState.OfferReceived &&
              rule.autoAcceptCredentialOffer !== false
            ) {
              await this.agent.didcomm.credentials.acceptOffer({
                credentialExchangeRecordId: credentialExchangeRecord.id,
              })
            } else if (credentialExchangeRecord.state === DidCommCredentialState.Done) {
              this.completeWorkflow()
            }
          } catch (err) {
            this.failWorkflow(CredentialProvisioningEventTypes.FailedHandleOffer, err as Error)
          }
        })
    } catch (err) {
      this.failWorkflow(CredentialProvisioningEventTypes.FailedRequestCredential, err as Error)
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
    // A workflow already claimed a proof; the workflow-scoped subscription
    // handles proofs on its own connection. Ignore everything else.
    if (this._workflowInProgress) {
      return
    }

    this.log?.info(`[AutoCredentialMonitor] Checking if proof request matches any rules`)

    // fetch and construct proof request format
    let requestFormat: ProofRequestFormat | undefined
    try {
      const format = await this.agent.didcomm.proofs.getFormatData(proof.id)
      requestFormat = (format.request?.anoncreds ?? format.request?.indy) as ProofRequestFormat | undefined
    } catch (err) {
      this.log?.warn(`[AutoCredentialMonitor] Could not read proof request format`, { error: err as Error })
      return
    }

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
        this.log?.info(
          `[AutoCredentialMonitor] Credential (${rule.triggerCredDefIds.join(', ')}) is ${isMissing ? 'NOT ' : ''}in the wallet`
        )
        if (isMissing) {
          // Fire and forget — inside runWorkflow drives its own subscriptions
          // and error handling. Return so we don't try further rules against the
          // same proof.
          this.runWorkflow(rule, proof)
          return
        }
      } catch (err) {
        this.log?.warn(`[AutoCredentialMonitor] Could not check credential availability`, { error: err as Error })
      }
    }
  }
}
