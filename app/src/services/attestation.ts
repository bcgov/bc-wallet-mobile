import { AnonCredsCredentialOffer } from '@credo-ts/anoncreds'
import {
  Agent,
  BaseEvent,
  CredentialState,
  CredentialEventTypes,
  CredentialExchangeRecord,
  ProofState,
  ProofEventTypes,
  ProofExchangeRecord,
  BaseLogger,
  ConnectionRecord,
} from '@credo-ts/core'
import {
  BifoldError,
  BifoldAgent,
  AttestationEventTypes,
  AttestationMonitor as AttestationMonitorI,
} from '@hyperledger/aries-bifold-core'
import {
  generateKey,
  appleAttestation,
  googleAttestation,
  isPlayIntegrityAvailable,
} from '@hyperledger/aries-react-native-attestation'
import { DeviceEventEmitter, Platform } from 'react-native'
import { getVersion, getBuildNumber, getSystemName, getSystemVersion } from 'react-native-device-info'
import { Subscription } from 'rxjs'

import { AttestationRestrictions } from '../constants'
import { removeExistingInvitationIfRequired } from '../helpers/BCIDHelper'
import { credentialsMatchForProof } from '../helpers/credentials'
import { AttestationRequestParams, AttestationResult, requestNonceDrpc, requestAttestationDrpc } from '../helpers/drpc'

const defaultResponseTimeoutInMs = 10000 // DRPC response timeout

export type AttestationMonitorOptions = {
  shouldHandleProofRequestAutomatically?: boolean
}

type AttestationEventTypeKeys = keyof typeof AttestationEventTypes
type AttestationEventTypeValues = (typeof AttestationEventTypes)[AttestationEventTypeKeys]
type AttestationRestrictionsType = typeof AttestationRestrictions

export interface AttestationCredentialFormat {
  attributes: {
    attestationInfo: []
  }
}

interface IndyRequest {
  indy: {
    requested_attributes?: {
      attestationInfo?: {
        names: string[]
        restrictions: { cred_def_id: string }[]
      }
    }
  }
}

interface AnonCredsRequest {
  anoncreds: {
    requested_attributes?: {
      attestationInfo?: {
        names: string[]
        restrictions: { cred_def_id: string }[]
      }
    }
  }
}

interface AttestationProofRequestFormat {
  request: IndyRequest & AnonCredsRequest
}

const AttestationErrorCodes = {
  BadInvitation: 2027,
  ReceiveInvitationError: 2028,
  GeneralProofError: 2029,
  FailedToConnectToAttestationAgent: 2030,
  FailedToFetchNonceForAttestation: 2031,
  FailedToGenerateAttestation: 2032,
  FailedToRequestAttestation: 2033,
  FailedToValidateAttestation: 2034,
} as const

type Restriction = {
  schema_id?: string
  issuer_did?: string
  cred_def_id?: string
  schema_version?: string
}

const findCredDefIDs = (restrictions: [Restriction]): Array<string> => {
  return restrictions.map((rstr) => rstr.cred_def_id).filter((credDefId) => credDefId !== undefined) as string[]
}

const invitationUrlFromRestrictions = async (
  proof: ProofExchangeRecord,
  agent: BifoldAgent,
  restrictions: AttestationRestrictionsType
): Promise<string | undefined> => {
  const format = (await agent.proofs.getFormatData(proof.id)) as unknown as AttestationProofRequestFormat
  const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'
  const restrictionsArePresent = format.request?.[formatToUse]?.requested_attributes?.attestationInfo?.restrictions

  if (!formatToUse || !restrictionsArePresent) {
    return undefined
  }

  const pRestrictions = format.request?.[formatToUse]?.requested_attributes?.attestationInfo?.restrictions
  const cred_def_ids = findCredDefIDs(pRestrictions as [Restriction])

  for (const env in restrictions) {
    for (const credDefId of cred_def_ids) {
      if (restrictions[env].credDefIDs.includes(credDefId)) {
        return restrictions[env].invitationUrl
      }
    }
  }

  return undefined
}

export const isProofRequestingAttestation = async (
  proof: ProofExchangeRecord,
  agent: BifoldAgent,
  restrictions: AttestationRestrictionsType
): Promise<boolean> => {
  return (await invitationUrlFromRestrictions(proof, agent, restrictions)) !== undefined
}

export const allCredDefIds = (restrictions: AttestationRestrictionsType): string[] => {
  const allCredDefIds: string[] = []

  for (const env in restrictions) {
    allCredDefIds.push(...restrictions[env].credDefIDs)
  }

  return allCredDefIds
}

export const isOfferingAttestation = (credDefId: string, restrictions: AttestationRestrictionsType) => {
  return allCredDefIds(restrictions).includes(credDefId)
}

export class AttestationMonitor implements AttestationMonitorI {
  private proofSubscription?: Subscription
  private offerSubscription?: Subscription
  private agent?: Agent
  private options: AttestationMonitorOptions
  private log?: BaseLogger
  private _attestationWorkflowInProgress = false
  private _shouldHandleProofRequestAutomatically = false
  private _proofRequest?: ProofExchangeRecord
  // private _currentWorkflowState?: typeof AttestationEventTypes

  // take in options, agent, and logger. Options should include the attestation service URL
  // and the proof to watch for along with the cred_ef_id of the attestation credentials.
  public constructor(logger: BaseLogger, options: AttestationMonitorOptions) {
    this.log = logger
    this.options = options
    const { shouldHandleProofRequestAutomatically } = options
    this._shouldHandleProofRequestAutomatically = shouldHandleProofRequestAutomatically ?? false
  }

  public get attestationWorkflowInProgress() {
    return this._attestationWorkflowInProgress
  }

  public set shouldHandleProofRequestAutomatically(value: boolean) {
    this._shouldHandleProofRequestAutomatically = value
  }

  public get shouldHandleProofRequestAutomatically() {
    return this._shouldHandleProofRequestAutomatically
  }

  public async start(agent: Agent): Promise<void> {
    this.agent = agent

    this.proofSubscription = this.agent?.events
      .observable(ProofEventTypes.ProofStateChanged)
      .subscribe(this.handleProofStateChanged)

    this.offerSubscription = this.agent?.events
      .observable(CredentialEventTypes.CredentialStateChanged)
      .subscribe(this.handleCredentialStateChanged)
  }

  public stop(): void {
    this.proofSubscription?.unsubscribe()
    this.offerSubscription?.unsubscribe()
  }

  public requestAttestationCredential = async (): Promise<void> => {
    if (!this.agent || !this._proofRequest) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'The agent cannot be undefined.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    this.log?.info('Fetching attestation credential')

    this.startWorkflow()

    try {
      const invitationUrl = await invitationUrlFromRestrictions(this._proofRequest, this.agent, AttestationRestrictions)
      if (!invitationUrl) {
        throw new BifoldError(
          'Attestation Service',
          'Unable to connect to the attestation service.',
          'No details provided.',
          AttestationErrorCodes.FailedToConnectToAttestationAgent
        )
      }

      const connection = await this.connectToAttestationAgent(invitationUrl)
      if (!connection) {
        throw new BifoldError(
          'Attestation Service',
          'Unable to connect to the attestation service.',
          'No details provided.',
          AttestationErrorCodes.FailedToConnectToAttestationAgent
        )
      }

      const nonce = await this.fetchNonceForAttestation(connection)
      if (!nonce) {
        throw new BifoldError(
          'Attestation Service',
          'There was a problem with the attestation service.',
          'No details provided.',
          AttestationErrorCodes.FailedToFetchNonceForAttestation
        )
      }

      const attestationObj = await this.generateAttestation(nonce)
      if (!attestationObj) {
        throw new BifoldError(
          'Attestation Service',
          'There was a problem with the attestation service.',
          'No details provided.',
          AttestationErrorCodes.FailedToGenerateAttestation
        )
      }

      const result = await this.requestAttestation(connection, attestationObj)
      if (result.status !== 'success') {
        throw new BifoldError(
          'Attestation Service',
          'There was a problem with the attestation service.',
          'No details provided.',
          AttestationErrorCodes.FailedToValidateAttestation
        )
      }
    } catch (error) {
      this.log?.error('Failed to fetch attestation credential', error as Error)

      this.stopWorkflow(AttestationEventTypes.FailedRequestCredential, error as Error)
    }
  }

  private startWorkflow = () => {
    this._attestationWorkflowInProgress = true
    DeviceEventEmitter.emit(AttestationEventTypes.Started)
  }

  private stopWorkflow = (eventType: AttestationEventTypeValues, error?: Error) => {
    this._attestationWorkflowInProgress = false
    this._proofRequest = undefined
    DeviceEventEmitter.emit(eventType, error)
  }

  private handleProofRequest = async (proofRequest: ProofExchangeRecord): Promise<boolean> => {
    if (!this.agent) {
      return false
    }

    this.log?.info('Selecting credentials for attestation proof request')
    // This will throw if we don't have the necessary credentials
    const credentials = await this.agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRequest.id,
    })

    this.log?.info('Accepting attestation proof request')
    await this.agent.proofs.acceptRequest({
      proofRecordId: proofRequest.id,
      proofFormats: credentials.proofFormats,
    })

    return true
  }

  private handleCredentialStateChanged = async (event: BaseEvent) => {
    if (!this.agent) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'The agent cannot be undefined.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    const { credentialRecord } = event.payload
    const credential = credentialRecord as CredentialExchangeRecord

    this.log?.info('Handling credential offer')

    try {
      const { offer } = await this.agent.credentials.getFormatData(credential.id)
      const offerData = (offer?.anoncreds ?? offer?.indy) as AnonCredsCredentialOffer

      // do nothing if not an attestation credential
      const offerIsForAttestation = await isOfferingAttestation(offerData?.cred_def_id ?? '', AttestationRestrictions)
      if (!offerIsForAttestation) {
        return
      }

      // if it's a new offer, automatically accept
      if (credential.state === CredentialState.OfferReceived) {
        this.log?.info('Accepting credential offer')
        await this.agent.credentials.acceptOffer({
          credentialRecordId: credential.id,
        })
      }

      // only finish loading state once credential is fully accepted
      if (credential.state === CredentialState.Done) {
        // TODO: credential.offer in flight completed
        this.log?.info('Credential accepted')

        if (this._shouldHandleProofRequestAutomatically && this._proofRequest) {
          if (this._proofRequest.state === ProofState.RequestReceived) {
            const result = await this.handleProofRequest(this._proofRequest)
            if (result) {
              this.stopWorkflow(AttestationEventTypes.Completed)
            }
          } else {
            this.stopWorkflow(AttestationEventTypes.Completed)
          }
        }
      }
    } catch (error) {
      this.log?.error('Failed to handle credential offer', error as Error)

      this.stopWorkflow(AttestationEventTypes.FailedHandleOffer, error as Error)
    }
  }

  private handleProofStateChanged = async (event: BaseEvent) => {
    if (!this.agent) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'The agent cannot be undefined.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    const { proofRecord } = event.payload
    const proof = proofRecord as ProofExchangeRecord

    this.log?.info('Handling proof received')

    if (proof.state !== ProofState.RequestReceived) {
      return
    }

    this.log?.info('Checking if proof is requesting attestation')

    try {
      // 1. Is the proof requesting an attestation credential
      if (!(await isProofRequestingAttestation(proof, this.agent, AttestationRestrictions))) {
        this.log?.info('Proof nope!!!!')

        return
      }

      this.log?.info('Proof is requesting attestation')

      if (this._shouldHandleProofRequestAutomatically) {
        this._proofRequest = proof

        this.startWorkflow()
      }

      // 2. Does the wallet have a valid attestation credential that will
      // satisfy the proof request?
      const required = await this.attestationCredentialRequired(this.agent, proof.id)

      // 3. If yes, do nothing
      if (!required) {
        this.log?.info('Valid credentials already exist, checking automatic handling')

        if (this._shouldHandleProofRequestAutomatically && this._proofRequest) {
          this.log?.info('Handling proof request automatically')

          const result = await this.handleProofRequest(proof)
          if (result) {
            this.stopWorkflow(AttestationEventTypes.Completed)
          }
        }

        return
      }

      // 4. If no, get a new attestation credential
      await this.requestAttestationCredential()
    } catch (error) {
      this.log?.error('Failed to handle proof', error as Error)

      this.stopWorkflow(AttestationEventTypes.FailedHandleProof, error as Error)
    }
  }

  private async connectToAttestationAgent(invitationUrl: string): Promise<ConnectionRecord | undefined> {
    if (!this.agent) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'The agent cannot be undefined.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    const invite = await this.agent.oob.parseInvitation(invitationUrl)

    if (!invite) {
      this.log?.error('Unable to parse attestation agent invitation')

      throw new BifoldError(
        'Attestation Service',
        'Unable to parse the attestation agent invitation',
        'No details provided.',
        AttestationErrorCodes.BadInvitation
      )
    }

    this.log?.info('Removing existing invitation if required')
    await removeExistingInvitationIfRequired(this.agent, invite.id)

    this.log?.info('Receiving invitation')
    const { connectionRecord } = await this.agent.oob.receiveInvitation(invite)
    if (!connectionRecord) {
      throw new BifoldError(
        'Attestation Service',
        'Unable to accept attestation agent invitation',
        'No details provided.',
        AttestationErrorCodes.BadInvitation
      )
    }

    // this step will fail if there is more than one active connection record between a given wallet and
    // the traction instance which is why we need to `removeExistingInvitationIfRequired` above
    return await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
  }

  private async fetchNonceForAttestation(connection: ConnectionRecord): Promise<string> {
    if (!this.agent) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'The agent cannot be undefined.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    this.log?.info('Requesting nonce from controller')

    const requestNonceCb = await requestNonceDrpc(this.agent, connection)
    const nonceResponse = await requestNonceCb(defaultResponseTimeoutInMs)

    if (!nonceResponse) {
      this.log?.error('Failed to fetch nonce for attestation, code = none, reason = timeout occurred.')

      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'Timeout occurred.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    this.log?.info('DRPC nonce response received')

    if (nonceResponse.error) {
      this.log?.error(
        `Failed to fetch nonce for attestation, code = ${nonceResponse.error.code}, reason = ${nonceResponse.error.message}`
      )

      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        nonceResponse.error.message ?? 'No details provided.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    const nonce = nonceResponse.result.nonce

    return nonce
  }

  private async requestAttestation(
    connection: ConnectionRecord,
    attestationObj: AttestationRequestParams
  ): Promise<AttestationResult> {
    if (!this.agent) {
      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'No details provided.',
        AttestationErrorCodes.FailedToFetchNonceForAttestation
      )
    }

    this.log?.info('Requesting attestation credential from controller')

    const requestAttestationCb = await requestAttestationDrpc(this.agent, connection, attestationObj)
    const attestationResponse = await requestAttestationCb(defaultResponseTimeoutInMs)

    if (!attestationResponse) {
      this.log?.error('Failed to request attestation, code = none, reason = timeout occurred.')

      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        'Timeout occurred.',
        AttestationErrorCodes.FailedToRequestAttestation
      )
    }

    this.log?.info('DRPC attestation response received')

    if (attestationResponse.error) {
      this.log?.error(
        `Failed to request attestation, code = ${attestationResponse.error.code}, reason = ${attestationResponse.error.message}`
      )

      throw new BifoldError(
        'Attestation Service',
        'There was a problem with the remote attestation service.',
        attestationResponse.error.message ?? 'No details provided.',
        AttestationErrorCodes.FailedToRequestAttestation
      )
    }

    return attestationResponse.result
  }

  private commonAttestationMessageComponent() {
    const common: Partial<AttestationRequestParams> = {
      app_version: `${getVersion()}-${getBuildNumber()}`,
      os_version: `${getSystemName()} ${getSystemVersion()}`,
    }

    return common
  }

  private async generateAttestation(nonce: string) {
    switch (Platform.OS) {
      case 'ios':
        return this.generateAppleAttestation(nonce)
      case 'android':
        return this.generateGoogleAttestation(nonce)

      default:
        // TODO(jl): throw unsupported platform error
        break
    }
  }

  private async generateAppleAttestation(nonce: string) {
    const common = this.commonAttestationMessageComponent()
    const shouldCacheKey = false

    this.log?.info('Generating key for Apple')
    const keyId = await generateKey(shouldCacheKey)

    this.log?.info('Using Apple on-device attestation')
    const attestationAsBuffer = await appleAttestation(keyId, nonce)
    const attestationRequest = {
      ...common,
      platform: 'apple',
      key_id: keyId,
      attestation_object: attestationAsBuffer.toString('base64'),
    } as AttestationRequestParams

    this.log?.info('On-device Apple attestation complete')

    return attestationRequest
  }

  private async generateGoogleAttestation(nonce: string) {
    const common = this.commonAttestationMessageComponent()

    this.log?.info('Checking if Play Integrity is available')

    const available = await isPlayIntegrityAvailable()
    if (!available) {
      return null
    }

    this.log?.info('Using Google on-device attestation')

    const tokenString = await googleAttestation(nonce)
    const attestationRequest = {
      ...common,
      platform: 'google',
      attestation_object: tokenString,
    } as AttestationRequestParams

    this.log?.info('On-device Google attestation complete')

    return attestationRequest
  }

  private attestationCredentialRequired = async (agent: BifoldAgent, proofId: string): Promise<boolean> => {
    agent.config.logger.info('Fetching proof by id')
    const proof = await agent?.proofs.getById(proofId)
    agent.config.logger.info('Second check if proof is requesting attestation')

    agent.config.logger.info('Checking if credentials match for proof request')
    const credentials = await credentialsMatchForProof(agent, proof)

    if (!credentials) {
      return true
    }

    // TODO:(jl) Should we be checking the length of the attributes matches some
    // expected length in the proof request?
    const format = (credentials.proofFormats.anoncreds ?? credentials.proofFormats.indy) as AttestationCredentialFormat
    if (format) {
      return format.attributes.attestationInfo.length === 0
    }

    return false
  }
}
