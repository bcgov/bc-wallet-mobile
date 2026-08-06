import { getDigitalServiceCardAccountProblem } from '@/bcsc-theme/utils/getDigitalServiceCardAccountProblem'
import { AbstractBifoldLogger, CredentialProvisioningEventTypes, CredentialProvisioningMonitor } from '@bifold/core'
import {
  AnonCredsProofRequestRestriction,
  AnonCredsRequestedAttribute,
  AnonCredsRequestedPredicate,
} from '@credo-ts/anoncreds'
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
  /**
   * An array of AnonCredsProofRequestRestriction objects that match the proof request
   * to trigger the workflow.  If any of the restrictions match, the rule is triggered.
   *
   * @example [ { cred_def_id: 'abc' }, { schema_id: 'xyz' } ] // first tries matching cred def, then schema
   */
  triggerRestrictions: AnonCredsProofRequestRestriction[]

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
   * "proof request references a missing cred def" trigger.
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
    const stubProof = { id: 'test-workflow-proof' } as DidCommProofExchangeRecord
    this.runWorkflow(rule, stubProof)
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

  // Check if all key-value pairs in the trigger match the restriction
  // ie: { cred_def_id: 'abc' } matches { cred_def_id: 'abc', schema_id: 'xyz' }
  // ie: { cred_def_id: 'abc', schema_id: 'xyz' } does NOT match { cred_def_id: 'abc' }
  private restrictionMatchesRule(restriction: AnonCredsProofRequestRestriction, rule: AutoCredentialRule): boolean {
    return rule.triggerRestrictions.some((trigger) => {
      if (Object.keys(trigger).length === 0) {
        return false
      }
      return Object.entries(trigger).every(([key, value]) => {
        const restrictionValue = restriction[key as keyof AnonCredsProofRequestRestriction]
        return restrictionValue === value
      })
    })
  }

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
      if ((attr.restrictions ?? []).some((restriction) => this.restrictionMatchesRule(restriction, rule))) {
        triggeredAttributeKeys.add(key)
      }
    }
    for (const [key, pred] of Object.entries(proofFormat.requested_predicates ?? {})) {
      if ((pred.restrictions ?? []).some((restriction) => this.restrictionMatchesRule(restriction, rule))) {
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
      const accountProblem = getDigitalServiceCardAccountProblem(err)
      if (accountProblem) {
        // User cannot satisfy the proof request because their BCSC card is suspended or deactivated
        // auto decline the proof
        try {
          await this.agent.didcomm.proofs.declineRequest({
            proofExchangeRecordId: proof.id,
            sendProblemReport: true,
          })
          this.log?.info(
            `[AutoCredentialMonitor] Declined proof request — account ${accountProblem}, cannot be satisfied`
          )
        } catch (declineErr) {
          this.log?.warn('[AutoCredentialMonitor] Failed to decline proof request after account-unavailable error', {
            error: declineErr as Error,
          })
        }
      }
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
      const proofRequestsWatchedCredential = restrictions.some((restriction) =>
        this.restrictionMatchesRule(restriction, rule)
      )

      this.log?.info(
        `[AutoCredentialMonitor] Proof ${proof.id} requests credential(s) that match rule trigger IDs: ${proofRequestsWatchedCredential}`
      )

      if (!proofRequestsWatchedCredential) {
        continue
      }

      try {
        const isMissing = await this.isCredentialMissingForRule(proof.id, requestFormat, rule)
        this.log?.info(`[AutoCredentialMonitor] Credential  is${isMissing ? ' NOT' : ''} in the wallet`)
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
