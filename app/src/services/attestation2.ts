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
import { isProofRequestingAttestation, attestationCredentialRequired } from '../helpers/Attestation'
import { BifoldError, EventTypes } from '@hyperledger/aries-bifold-core'
import { removeExistingInvitationIfRequired } from '../helpers/BCIDHelper'
import { requestNonceDrpc, requestAttestationDrpc } from '../helpers/drpc'
import { DrpcRequest, DrpcResponse } from '@credo-ts/drpc'
import {
  generateKey,
  appleAttestation,
  googleAttestation,
  isPlayIntegrityAvailable,
} from '@hyperledger/aries-react-native-attestation'
import { getVersion, getBuildNumber, getSystemName, getSystemVersion } from 'react-native-device-info'
import { AnonCredsCredentialOffer } from '@credo-ts/anoncreds'

const defaultResponseTimeout = 10000

export type AttestationMonitorOptions = {
  attestationInviteUrl: string
  attestationCredDefIds: string[]
}

export enum AttestationEventTypes {
  AttestationStarted = ' AttestationEvent.Started',
  AttestationCompleted = ' AttestationEvent.Completed',
}

enum ErrorCodes {
  AttestationBadInvitation = 2027,
  AttestationReceiveInvitationError = 2028,
  AttestationGeneralProofError = 2029,
}

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

// The attestation code in BC Wallet was initially written as a PoC and
// later got to working status under a time crunch. Here a few potential items that
// could be refactored about the attestation code:

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

      // const { offer } = await agent.credentials.getFormatData(record.id)
      // const offerData = offer?.anoncreds ?? offer?.indy

      console.log('***************** 1')
      // do nothing if not an attestation credential
      const { attestationCredDefIds } = this.options
      if (!attestationCredDefIds.includes(offerData?.cred_def_id ?? '')) {
        return
      }
      console.log('***************** 2')

      // if it's a new offer, automatically accept
      if (credential.state === CredentialState.OfferReceived) {
        console.log('***************** 2', credential.id)

        this.log?.info('Accepting credential offer')
        await this.agent.credentials.acceptOffer({
          credentialRecordId: credential.id,
        })
      }

      console.log('***************** 3', credential.state)

      // only finish loading state once credential is fully accepted
      if (credential.state === CredentialState.Done) {
        console.log('***************** 4')

        this.log?.info('Credential accepted')
      }

      console.log('***************** 5')
    } catch (error) {
      console.log('***************** 6', error)
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
    if (!(await isProofRequestingAttestation(proof, this.agent))) {
      return
    }

    this.log?.info('Proof is requesting attestation')

    // 2. Does the wallet have a valid attestation credential
    const required = await attestationCredentialRequired(this.agent, proof.id)

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

    DeviceEventEmitter.emit(AttestationEventTypes.AttestationStarted)

    try {
      const connection = await this.connectToAttestationAgent()
      if (!connection) {
        return
      }

      const nonce = await this.fetchNonceForAttestation(connection)
      if (!nonce) {
        return
      }

      const attestationObj = await this.generateAttestation(nonce)
      if (!attestationObj) {
        return
      }

      const result = this.requestAttestation(connection, attestationObj)

      DeviceEventEmitter.emit(AttestationEventTypes.AttestationCompleted, result)
    } catch (error) {
      console.log('*****************4', error)
    }
  }

  private async connectToAttestationAgent(): Promise<ConnectionRecord | undefined> {
    try {
      const invite = await this.agent.oob.parseInvitation(this.options.attestationInviteUrl)

      if (!invite) {
        const err = new BifoldError('Problem', 'Reason', '', ErrorCodes.AttestationBadInvitation)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

        return
      }

      this.log?.info('Removing existing invitation if required')
      await removeExistingInvitationIfRequired(this.agent, invite.id)

      this.log?.info('Receiving invitation')
      const { connectionRecord } = await this.agent.oob.receiveInvitation(invite)
      if (!connectionRecord) {
        const err = new BifoldError('Title', 'Problem', '', ErrorCodes.AttestationReceiveInvitationError)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

        return
      }

      // this step will fail if there is more than one active connection record between a given wallet and
      // the traction instance which is why we need to `removeExistingInvitationIfRequired` above
      return await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
    } catch (error) {
      const err = new BifoldError('Title', 'Problem', '', ErrorCodes.AttestationGeneralProofError)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

      return
    }
  }

  private async fetchNonceForAttestation(connection: ConnectionRecord): Promise<string> {
    this.log?.info('Requesting nonce from controller')

    const requestNonceCb = await requestNonceDrpc(this.agent, connection)

    // {"jsonrpc":"2.0","result":{"nonce":"abc123"},"id":337401}
    const nonceResponse = await requestNonceCb(defaultResponseTimeout)

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
    const attestationResponse = await requestAttestationCb(defaultResponseTimeout)

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
        // TODO(jl): throw error
        break
    }
  }

  private async generateAppleAttestation(nonce: string) {}

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
}
