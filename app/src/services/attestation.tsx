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
} from '@aries-framework/core'
import { useAgent } from '@aries-framework/react-hooks'
import { DrpcRequest, DrpcResponse } from '@credo-ts/drpc'
import { BifoldAgent, BifoldError, EventTypes, useStore } from '@hyperledger/aries-bifold-core'
import {
  generateKey,
  appleAttestation,
  googleAttestation,
  isPlayIntegrityAvailable,
} from '@hyperledger/aries-react-native-attestation'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Platform } from 'react-native'
import { getVersion, getBuildNumber, getSystemName, getSystemVersion } from 'react-native-device-info'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Subscription } from 'rxjs'

import {
  attestationCredDefIds,
  isProofRequestingAttestation,
  attestationCredentialRequired,
} from '../helpers/Attestation'
import { removeExistingInvitationIfRequired } from '../helpers/BCIDHelper'
import { BCState } from '../store'

enum ErrorCodes {
  AttestationBadInvitation = 2027,
  AttestationReceiveInvitationError = 2028,
  AttestationGeneralProofError = 2029,
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

type AttestationProviderParams = {
  children: React.ReactNode
}

export type EventListenerFn = (event: BaseEvent) => void

const requestNonceDrpc = async (agent: Agent, connectionRecord: ConnectionRecord) => {
  const nonceRequestMessage: DrpcRequest = {
    jsonrpc: '2.0',
    method: 'request_nonce',
    id: null,
  }
  await agent.modules.drpc.sendRequest(connectionRecord.id, nonceRequestMessage)
}

export interface AttestationX {
  start: () => Promise<void>
  stop: () => Promise<void>
  loading: boolean
}

export const AttestationContext = createContext<AttestationX>(null as unknown as AttestationX)

export const AttestationProvider: React.FC<AttestationProviderParams> = ({ children }) => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [messageSubscription, setMessageSubscription] = useState<Subscription>()
  const [proofSubscription, setProofSubscription] = useState<Subscription>()
  const [offerSubscription, setOfferSubscription] = useState<Subscription>()
  const [drpcRequest, setDrpcRequest] = useState<DrpcRequest | undefined>(undefined)
  const [drpcListenerActive, setDrpcListenerActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [store] = useStore<BCState>()

  const handleInfrastructureMessageDrpc = async (message: {
    params: { nonce: string }
  }): Promise<ChallengeResponseInfrastructureMessage | null> => {
    try {
      const common: Partial<ChallengeResponseInfrastructureMessage> = {
        app_version: `${getVersion()}-${getBuildNumber()}`,
        os_version: `${getSystemName()} ${getSystemVersion()}`,
      }
      const infraMessage = { nonce: message.params.nonce }

      if (Platform.OS === 'ios') {
        const shouldCacheKey = false
        const keyId = await generateKey(shouldCacheKey)
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

        return attestationResponse
      } else if (Platform.OS === 'android') {
        const available = await isPlayIntegrityAvailable()
        if (!available) {
          return null
        }
        const tokenString = await googleAttestation((infraMessage as RequestIssuanceInfrastructureMessage).nonce)
        const attestationResponse = {
          ...common,
          platform: 'google',
          attestation_object: tokenString,
        } as ChallengeResponseInfrastructureMessage

        return attestationResponse
      } else {
        setLoading(false)
        return null
      }
    } catch (error: unknown) {
      setLoading(false)
      return null
    }
  }

  const handleProofs = async (proof: ProofExchangeRecord, agent: BifoldAgent): Promise<void> => {
    try {
      // 0. if the proof is just now being requested, handle. Otherwise do nothing
      if (proof.state !== ProofState.RequestReceived) {
        return
      }

      // officially start attestation process here
      setLoading(true)
      // 1. Is the proof requesting an attestation credential
      if (!(await isProofRequestingAttestation(proof, agent, attestationCredDefIds))) {
        setLoading(false)
        return
      }

      // 2. Does the wallet owner have a valid attestation credential
      const required = await attestationCredentialRequired(agent, proof.id)

      // 3. If yes, do nothing
      if (!required) {
        setLoading(false)

        return
      }

      // 4. If no, start attestation flow by requesting a nonce from controller
      const invite = await agent.oob.parseInvitation(store.developer.environment.attestationInviteUrl)

      if (!invite) {
        setLoading(false)
        const err = new BifoldError(
          t('Error.Title2027'),
          t('Error.Message2027'),
          '',
          ErrorCodes.AttestationBadInvitation
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)
        return
      }

      await removeExistingInvitationIfRequired(agent, invite.id)

      const { connectionRecord } = await agent.oob.receiveInvitation(invite)
      if (!connectionRecord) {
        setLoading(false)
        const err = new BifoldError(
          t('Error.Title2028'),
          t('Error.Message2028'),
          '',
          ErrorCodes.AttestationReceiveInvitationError
        )

        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)

        return
      }

      const connectedRecord = await agent.connections.returnWhenIsConnected(connectionRecord.id)

      // this step will fail if there is more than one active connection record between a given wallet and
      // the traction instance which is why we need to removeExistingInvitationIfRequired above
      await requestNonceDrpc(agent, connectedRecord)
    } catch (error: unknown) {
      setLoading(false)
      const err = new BifoldError(
        t('Error.Title2029'),
        t('Error.Message2029'),
        (error as Error)?.message ?? error,
        ErrorCodes.AttestationGeneralProofError
      )
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, err)
    }
  }

  const handleOffers = async (record: CredentialExchangeRecord, agent: BifoldAgent): Promise<void> => {
    try {
      const { offer } = await agent.credentials.getFormatData(record.id)
      const offerData = offer?.anoncreds ?? offer?.indy

      // do nothing if not an attestation credential
      if (!attestationCredDefIds.includes(offerData?.cred_def_id ?? '')) {
        return
      }

      // if it's a new offer, automatically accept
      if (record.state === CredentialState.OfferReceived) {
        await agent.credentials.acceptOffer({
          credentialRecordId: record.id,
        })
      }

      // only finish loading state once credential is fully accepted
      if (record.state === CredentialState.Done) {
        setLoading(false)
      }
    } catch (error: unknown) {
      /* noop */
    }
  }

  const handleProofWithParam = (event: BaseEvent) => {
    if (!agent) {
      return
    }

    const { proofRecord } = event.payload
    handleProofs(proofRecord as ProofExchangeRecord, agent)
  }

  const handleOfferWithParam = (event: BaseEvent) => {
    if (!agent) {
      return
    }

    const { credentialRecord } = event.payload
    handleOffers(credentialRecord as CredentialExchangeRecord, agent)
  }

  useEffect(() => {
    if (drpcListenerActive && agent) {
      agent.modules.drpc
        .recvRequest()
        .then(
          async ({
            request,
            sendResponse,
          }: {
            request: DrpcRequest
            sendResponse: (resp: DrpcResponse) => Promise<void>
          }) => {
            // bit of a hack to restart the listener once we've received a request
            setDrpcRequest(request)
            if (!Array.isArray(request) && request.params) {
              const infraMsg = await handleInfrastructureMessageDrpc({ params: request.params as { nonce: string } })
              sendResponse({ jsonrpc: '2.0', result: infraMsg, id: request.id })
            }
          }
        )
    }
  }, [drpcRequest, drpcListenerActive])

  const start = async () => {
    if (!agent) {
      return
    }

    if (!proofSubscription) {
      const proofSub = agent.events.observable(ProofEventTypes.ProofStateChanged).subscribe(handleProofWithParam)
      setProofSubscription(proofSub)
    }

    if (!offerSubscription) {
      const offerSub = agent.events
        .observable(CredentialEventTypes.CredentialStateChanged)
        .subscribe(handleOfferWithParam)
      setOfferSubscription(offerSub)
    }

    setDrpcListenerActive(true)
  }

  const stop = async () => {
    setLoading(false)

    if (messageSubscription) {
      messageSubscription.unsubscribe()
      setMessageSubscription(undefined)
    }
    if (proofSubscription) {
      proofSubscription.unsubscribe()
      setProofSubscription(undefined)
    }
    if (offerSubscription) {
      offerSubscription.unsubscribe()
      setOfferSubscription(undefined)
    }

    setDrpcListenerActive(false)
  }

  const value = {
    start,
    stop,
    loading,
  }

  return <AttestationContext.Provider value={value}>{children}</AttestationContext.Provider>
}

export const useAttestation = () => {
  const attestationContext = useContext(AttestationContext)
  if (!attestationContext) {
    throw new Error('attestationContext must be used within a AttestationContextProvider')
  }

  return attestationContext
}
