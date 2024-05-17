import { DeviceEventEmitter, Platform } from 'react-native'
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
import { Subscription } from 'rxjs'
import { BifoldError, EventTypes } from '@hyperledger/aries-bifold-core'
import { removeExistingInvitationIfRequired } from '../helpers/BCIDHelper'
import { requestNonceDrpc, requestAttestationDrpc } from '../helpers/drpc'
import {
  generateKey,
  appleAttestation,
  googleAttestation,
  isPlayIntegrityAvailable,
} from '@hyperledger/aries-react-native-attestation'
import { getVersion, getBuildNumber, getSystemName, getSystemVersion } from 'react-native-device-info'
import { AnonCredsCredentialOffer } from '@credo-ts/anoncreds'
import { BifoldAgent } from '@hyperledger/aries-bifold-core'
import { credentialsMatchForProof } from '../helpers/credentials'

const defaultResponseTimeoutInMs = 10000 // DRPC response timeout

export type AttestationMonitorOptions = {
  attestationInviteUrl: string
  attestationCredDefIds: string[]
}

export const AttestationEventTypes = {
  Started: 'AttestationEvent.Started',
  Completed: 'AttestationEvent.Completed',
  Failed: 'AttestationEvent.Failed',
} as const

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

// type t = (key: string | Array<string>, options?: object) => string

const AttestationErrorCodes = {
  BadInvitation: 2027,
  ReceiveInvitationError: 2028,
  GeneralProofError: 2029,
  FailedToConnectToAttestationAgent: 2030,
  FailedToFetchNonceForAttestation: 2031,
  FailedToGenerateAttestation: 2032,
} as const

type AttestationResult = {
  status: 'success' | 'failure'
}

type InfrastructureMessage = {
  platform?: 'apple' | 'google'
  os_version?: string
  app_version?: string
}

type RequestIssuanceInfrastructureMessage = InfrastructureMessage & {
  nonce: string
}

type ChallengeResponseInfrastructureMessage = InfrastructureMessage & {
  key_id?: string
  attestation_object: string
}

// Move logic out of specific screens (PersonCredential screen) and into a centralized service
// Add logic to get a new attestation credential if existing ones are older than some amount of time (14 days?)
// Add logic to remove old attestation credentials
// Take the attestation code out of the hook and into a service that can be initialized on startup, allowing for stop and start to be called from anywhere
// Add status updates to the process

export class AttestationMonitor {
  private proofSubscription?: Subscription
  private offerSubscription?: Subscription
  private agent: Agent
  private options: AttestationMonitorOptions
  private log?: BaseLogger
  public attestationWorkflowInProgress = false

  // take in options, agent, and logger. Options should include the attestation service URL
  // and the proof to watch for along with the cred_ef_id of the attestation credentials.
  constructor(agent: Agent, logger: BaseLogger, options: AttestationMonitorOptions) {
    this.agent = agent
    this.log = logger
    this.options = options
  }

  public async start() {
    this.proofSubscription = this.agent.events
      .observable(ProofEventTypes.ProofStateChanged)
      .subscribe(this.handleProofReceived)

    this.offerSubscription = this.agent.events
      .observable(CredentialEventTypes.CredentialStateChanged)
      .subscribe(this.handleCredentialOfferReceived)
  }

  public stop() {
    this.proofSubscription?.unsubscribe()
    this.offerSubscription?.unsubscribe()
  }

  private handleCredentialOfferReceived = async (event: BaseEvent) => {
    const { credentialRecord } = event.payload
    const credential = credentialRecord as CredentialExchangeRecord

    try {
      const { offer } = await this.agent.credentials.getFormatData(credential.id)
      const offerData = (offer?.anoncreds ?? offer?.indy) as AnonCredsCredentialOffer

      // do nothing if not an attestation credential
      const { attestationCredDefIds } = this.options
      if (!attestationCredDefIds.includes(offerData?.cred_def_id ?? '')) {
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
        this.log?.info('Credential accepted')
      }
    } catch (error) {
      console.log('*****************', error)
    }
  }

  private handleProofReceived = async (event: BaseEvent) => {
    const { proofRecord } = event.payload
    const proof = proofRecord as ProofExchangeRecord

    if (proof.state !== ProofState.RequestReceived) {
      return
    }

    this.log?.info('Checking if proof is requesting attestation')

    // TODO(jl): wrap in try catch

    // 1. Is the proof requesting an attestation credential
    if (!(await this.isProofRequestingAttestation(proof, this.agent))) {
      return
    }

    this.log?.info('Proof is requesting attestation')

    // 2. Does the wallet have a valid attestation credential that will
    // satisfy the proof request?
    const required = await this.attestationCredentialRequired(this.agent, proof.id)

    // 3. If yes, do nothing
    if (!required) {
      this.log?.info('Valid credentials already exist, nothing to do')

      return
    }

    // 4. If no, get a new attestation credential
    await this.fetchAttestationCredential()
  }

  public fetchAttestationCredential = async () => {
    this.log?.info('Fetching attestation credential')

    this.attestationWorkflowInProgress = true
    DeviceEventEmitter.emit(AttestationEventTypes.Started)

    try {
      const connection = await this.connectToAttestationAgent()
      if (!connection) {
        this.attestationWorkflowInProgress = false
        const err = new BifoldError('Problem', 'Reason', '', AttestationErrorCodes.FailedToConnectToAttestationAgent)
        DeviceEventEmitter.emit(AttestationEventTypes.Failed, err)

        return
      }

      const nonce = await this.fetchNonceForAttestation(connection)
      if (!nonce) {
        this.attestationWorkflowInProgress = false
        const err = new BifoldError('Problem', 'Reason', '', AttestationErrorCodes.FailedToFetchNonceForAttestation)
        DeviceEventEmitter.emit(AttestationEventTypes.Failed, err)

        return
      }

      const attestationObj = await this.generateAttestation(nonce)
      if (!attestationObj) {
        this.attestationWorkflowInProgress = false
        const err = new BifoldError('Problem', 'Reason', '', AttestationErrorCodes.FailedToGenerateAttestation)
        DeviceEventEmitter.emit(AttestationEventTypes.Failed, err)

        return
      }

      const result = this.requestAttestation(connection, attestationObj)

      DeviceEventEmitter.emit(AttestationEventTypes.Completed, result)
    } catch (error) {
      this.attestationWorkflowInProgress = false
    }
  }

  private async connectToAttestationAgent(): Promise<ConnectionRecord | undefined> {
    try {
      const invite = await this.agent.oob.parseInvitation(this.options.attestationInviteUrl)

      if (!invite) {
        const err = new BifoldError('Problem', 'Reason', '', AttestationErrorCodes.BadInvitation)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

        return
      }

      this.log?.info('Removing existing invitation if required')
      await removeExistingInvitationIfRequired(this.agent, invite.id)

      this.log?.info('Receiving invitation')
      const { connectionRecord } = await this.agent.oob.receiveInvitation(invite)
      if (!connectionRecord) {
        const err = new BifoldError('Title', 'Problem', '', AttestationErrorCodes.ReceiveInvitationError)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

        return
      }

      // this step will fail if there is more than one active connection record between a given wallet and
      // the traction instance which is why we need to `removeExistingInvitationIfRequired` above
      return await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
    } catch (error) {
      const err = new BifoldError('Title', 'Problem', '', AttestationErrorCodes.GeneralProofError)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

      return
    }
  }

  private async fetchNonceForAttestation(connection: ConnectionRecord): Promise<string> {
    this.log?.info('Requesting nonce from controller')

    const requestNonceCb = await requestNonceDrpc(this.agent, connection)

    // {"jsonrpc":"2.0","result":{"nonce":"abc123"},"id":337401}
    const nonceResponse = await requestNonceCb(defaultResponseTimeoutInMs)

    this.log?.info('DRPC nonce response received')

    const nonce = nonceResponse?.result?.nonce

    return nonce
  }

  private async requestAttestation(
    connection: ConnectionRecord,
    attestationObj: ChallengeResponseInfrastructureMessage
  ): Promise<AttestationResult> {
    this.log?.info('Requesting attestation credential from controller')

    const requestAttestationCb = await requestAttestationDrpc(this.agent, connection, attestationObj)
    // {"jsonrpc":"2.0","result":{"status":"success"},"id":997408}
    const attestationResponse = await requestAttestationCb(defaultResponseTimeoutInMs)

    return attestationResponse?.result
  }

  // TODO(jl): The types probably need to be renamed
  // common `AttestationMessageComponent`?
  private commonInfrastructureMessageComponent() {
    const common: Partial<ChallengeResponseInfrastructureMessage> = {
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
    const infraMessage = { nonce }
    const common = this.commonInfrastructureMessageComponent()
    const shouldCacheKey = false

    this.log?.info('Generating key for Apple')
    const keyId = await generateKey(shouldCacheKey)

    this.log?.info('Using Apple on-device attestation')
    const attestationAsBuffer = await appleAttestation(
      keyId,
      (infraMessage as RequestIssuanceInfrastructureMessage).nonce
    )
    const attestationResponse = {
      ...common,
      platform: 'apple',
      key_id: keyId,
      attestation_object: attestationAsBuffer.toString('base64'),
    } as ChallengeResponseInfrastructureMessage

    this.log?.info('On-device Apple attestation complete')

    return attestationResponse
  }

  private async generateGoogleAttestation(nonce: string) {
    const infraMessage = { nonce }
    const common = this.commonInfrastructureMessageComponent()

    this.log?.info('Checking if Play Integrity is available')

    const available = await isPlayIntegrityAvailable()
    if (!available) {
      return null
    }

    this.log?.info('Using Google on-device attestation')

    const tokenString = await googleAttestation((infraMessage as RequestIssuanceInfrastructureMessage).nonce)
    const attestationResponse = {
      ...common,
      platform: 'google',
      attestation_object: tokenString,
    } as ChallengeResponseInfrastructureMessage

    this.log?.info('On-device Google attestation complete')

    return attestationResponse
  }

  private isProofRequestingAttestation = async (proof: ProofExchangeRecord, agent: BifoldAgent): Promise<boolean> => {
    const { attestationCredDefIds } = this.options
    const format = (await agent.proofs.getFormatData(proof.id)) as unknown as AttestationProofRequestFormat
    const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'

    return !!format.request?.[formatToUse]?.requested_attributes?.attestationInfo?.restrictions?.some((rstr) =>
      attestationCredDefIds.includes(rstr.cred_def_id)
    )
  }

  private attestationCredentialRequired = async (agent: BifoldAgent, proofId: string): Promise<boolean> => {
    agent.config.logger.info('Attestation: fetching proof by id')
    const proof = await agent?.proofs.getById(proofId)
    agent.config.logger.info('Attestation: second check if proof is requesting attestation')
    const isAttestation = await this.isProofRequestingAttestation(proof, agent)

    if (!isAttestation) {
      return false
    }

    agent.config.logger.info('Attestation: checking if credentials match for proof request')
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
