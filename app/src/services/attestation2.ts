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
  ConnectionRecord,
  BaseLogger,
} from '@credo-ts/core'
import { Subscription } from 'rxjs'
import { isProofRequestingAttestation, attestationCredentialRequired } from '../helpers/Attestation'
import { useTheme } from '@react-navigation/native'
import { BifoldAgent, BifoldError, EventTypes, useStore } from '@hyperledger/aries-bifold-core'
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

const defaultResponseTimeout = 10000

enum ErrorCodes {
  AttestationBadInvitation = 2027,
  AttestationReceiveInvitationError = 2028,
  AttestationGeneralProofError = 2029,
}

export enum RemoteLoggerEventTypes {
  ENABLE_REMOTE_LOGGING = 'RemoteLogging.Enable',
}

export type AttestationMonitorOptions = {
  attestationInviteUrl: string
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

    // this.agent.modules.drpc.responseListener = this.handleDrpcResponse
  }

  // private async handleDrpcResponse(response: DrpcResponse) {
  //   console.log('*****************************')
  //   console.log('*****************************')
  //   console.log('*****************************')
  //   console.log('*****************************')
  //   console.log('Received DRPC response', response)
  //   console.log('*****************************')
  //   console.log('*****************************')
  //   console.log('*****************************')
  //   console.log('*****************************')
  // }

  // this.eventListener = this.agent.events.on<ProofEventTypes.ProofReceived>(ProofEventTypes.ProofReceived, this.handleProofReceived)

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
    const connection = await this.agent.connections.returnWhenIsConnected(connectionRecord.id)

    this.log?.info('Requesting nonce from controller')

    const requestNonceCb = await requestNonceDrpc(this.agent, connection)

    try {
      const nonceResponse = await requestNonceCb(defaultResponseTimeout)

      console.log('nonceResponse', JSON.stringify(nonceResponse))
      const nonce = nonceResponse?.result?.nonce
      console.log('nonce', nonce)

      const attestationObj = await this.generateAttestation(nonce)

      console.log('*****************4')
      console.log('*****************4')
      // console.log('attestationObj', attestationObj)

      const requestAttestationCb = await requestAttestationDrpc(this.agent, connection, attestationObj)
      const attestationResponse = await requestAttestationCb(defaultResponseTimeout)
      console.log('attestation response = ', JSON.stringify(attestationResponse))
    } catch (error) {
      console.log('*****************4', error)
    }
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
