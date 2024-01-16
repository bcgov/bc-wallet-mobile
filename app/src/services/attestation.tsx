import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import {
  Agent,
  BaseEvent,
  BasicMessageEventTypes,
  BasicMessageRecord,
  BasicMessageRole,
  CredentialState,
  CredentialEventTypes,
  CredentialExchangeRecord,
  ProofState,
  ProofEventTypes,
  ProofExchangeRecord,
} from '@aries-framework/core'
import { useAgent } from '@aries-framework/react-hooks'
import { BifoldAgent } from '@hyperledger/aries-bifold-core'
import {
  generateKey,
  appleAttestation,
  googleAttestation,
  isPlayIntegrityAvailable,
} from '@hyperledger/aries-react-native-attestation'
import { Buffer } from 'buffer'
import React, { createContext, useContext, useState } from 'react'
import { Platform } from 'react-native'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Subscription } from 'rxjs'

import { removeExistingInvitationIfRequired } from '../helpers/BCIDHelper'

enum Action {
  RequestNonce = 'request_nonce',
  RequestAttestation = 'request_attestation',
  ChallengeResponse = 'challenge_response',
}

type InfrastructureMessage = {
  type: 'attestation'
  platform?: 'apple' | 'google'
  version: 1
  action: Action
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

const attestationCredDefIds = [
  'J6LCm5Edi9Mi3ASZCqNC1A:3:CL:109799:dev-attestation',
  'NxWbeuw8Y2ZBiTrGpcK7Tn:3:CL:48312:default',
]

// proof requests can vary wildly but we'll know attestation requests must contain the cred def id as a restriction
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

// same as above
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

export interface AttestationX {
  start: () => Promise<void>
  stop: () => Promise<void>
}

export const AttestationContext = createContext<AttestationX>(null as unknown as AttestationX)

export const AttestationProvider: React.FC<AttestationProviderParams> = ({ children }) => {
  const { agent } = useAgent()
  const [messageSubscription, setMessageSubscription] = useState<Subscription>()
  const [proofSubscription, setProofSubscription] = useState<Subscription>()
  const [offerSubscription, setOfferSubscription] = useState<Subscription>()

  const isInfrastructureMessage = (record: BasicMessageRecord): boolean => {
    if (record.content) {
      try {
        const decoded = Buffer.from(record.content, 'base64').toString('utf-8')
        const encoded = Buffer.from(decoded).toString('base64')

        return encoded === record.content
      } catch (error) {
        return false
      }
    }

    return false
  }

  const handleInfrastructureMessage = async (
    message: InfrastructureMessage
  ): Promise<ChallengeResponseInfrastructureMessage | null> => {
    switch (message.action) {
      case Action.RequestAttestation:
        try {
          if (Platform.OS === 'ios') {
            const shouldCacheKey = false
            const keyId = await generateKey(shouldCacheKey)
            const attestationAsBuffer = await appleAttestation(
              keyId,
              (message as RequestIssuanceInfrastructureMessage).nonce
            )
            const attestationResponse: ChallengeResponseInfrastructureMessage = {
              type: 'attestation',
              platform: 'apple',
              version: 1,
              action: Action.ChallengeResponse,
              key_id: keyId,
              attestation_object: attestationAsBuffer.toString('base64'),
            }

            return attestationResponse
          } else if (Platform.OS === 'android') {
            const available = await isPlayIntegrityAvailable()
            if (!available) {
              return null
            }
            const tokenString = await googleAttestation((message as RequestIssuanceInfrastructureMessage).nonce)
            const attestationResponse: ChallengeResponseInfrastructureMessage = {
              type: 'attestation',
              platform: 'google',
              version: 1,
              action: Action.ChallengeResponse,
              attestation_object: tokenString,
            }

            return attestationResponse
          } else {
            return null
          }
        } catch (error: unknown) {
          return null
        }

      default:
        return null
    }
  }

  const decodeInfrastructureMessage = (record: BasicMessageRecord): InfrastructureMessage | null => {
    try {
      const decoded = Buffer.from(record.content, 'base64').toString('utf-8')
      const message = JSON.parse(decoded)

      return message
    } catch (error) {
      return null
    }
  }

  const handleMessages = async (message: BasicMessageRecord, agent: Agent): Promise<void> => {
    try {
      if (message.role === BasicMessageRole.Sender) {
        // We don't want to process or keep messages from
        // ourselves
        await agent?.basicMessages.deleteById(message.id)
        return
      }

      if (!isInfrastructureMessage(message)) {
        // We don't care about non-infrastructure messages
        return
      }

      const imessage = decodeInfrastructureMessage(message)
      if (!imessage) {
        return
      }

      const result = await handleInfrastructureMessage(imessage)

      if (result) {
        const responseMessageContent = Buffer.from(JSON.stringify(result)).toString('base64')
        await agent?.basicMessages.sendMessage(message.connectionId, responseMessageContent)
      }

      await agent?.basicMessages.deleteById(message.id)
    } catch (error: unknown) {
      /* noop */
    }
  }

  const handleProofs = async (proof: ProofExchangeRecord, agent: BifoldAgent): Promise<void> => {
    try {
      // 0. if the proof is just now being requested, handle. Otherwise do nothing
      if (proof.state === ProofState.RequestReceived) {
        // 1. Is the proof requesting an attestation credential
        const format = (await agent.proofs.getFormatData(proof.id)) as unknown as AttestationProofRequestFormat
        const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'
        const isRequestingAttestation = format.request?.[
          formatToUse
        ]?.requested_attributes?.attestationInfo?.restrictions?.some((rstr) =>
          attestationCredDefIds.includes(rstr.cred_def_id)
        )

        if (isRequestingAttestation) {
          // 2. Does the wallet owner have that attestation credential
          const credentials = await agent.credentials.getAll()
          const availableAttestationCredentials = credentials.filter((record) => {
            const credDefId = record.metadata.get(AnonCredsCredentialMetadataKey)?.credentialDefinitionId
            return credDefId && attestationCredDefIds.includes(credDefId)
          })

          // 3. If no, start attestation flow by requesting a nonce
          if (availableAttestationCredentials.length < 1) {
            // change this URL to a multi use connection from your traction instance for testing
            const attestationInviteUrl =
              'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI3YjNhMGE5Yi05YzBiLTRjYmUtODRlZC05Y2MwNmEyNmE0ZjYiLCAibGFiZWwiOiAiYnJ5Y2VtY21hdGgiLCAicmVjaXBpZW50S2V5cyI6IFsiMnlKMW9WMVlXcDJGTGIyVGR0ZmU2M1lKVTVEb0dHcHZuc3FkeXVTU3NUQnEiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIn0='
            const invite = await agent.oob.parseInvitation(attestationInviteUrl)

            if (!invite) {
              throw new Error('Bad invitation')
            }

            await removeExistingInvitationIfRequired(agent, invite.id)

            const { connectionRecord } = await agent.oob.receiveInvitation(invite)

            if (!connectionRecord) {
              throw new Error('Cannot receive invitation')
            }

            const connectedRecord = await agent.connections.returnWhenIsConnected(connectionRecord.id)

            if (!connectedRecord) {
              throw new Error('Connection not active')
            }

            const nonceRequestMessage: InfrastructureMessage = {
              type: 'attestation',
              version: 1,
              action: Action.RequestNonce,
            }

            const responseMessageContent = Buffer.from(JSON.stringify(nonceRequestMessage)).toString('base64')

            // this step will fail if there is more than one active connection record between a given wallet and
            // the traction instance which is why we need to removeExistingInvitationIfRequired above
            await agent.basicMessages.sendMessage(connectedRecord.id, responseMessageContent)
          }
        }
      }
    } catch (error: unknown) {
      /* noop */
    }
  }

  const handleOffers = async (record: CredentialExchangeRecord, agent: BifoldAgent): Promise<void> => {
    try {
      const { offer } = await agent.credentials.getFormatData(record.id)
      const offerData = offer?.anoncreds ?? offer?.indy

      if (
        record.state === CredentialState.OfferReceived &&
        attestationCredDefIds.includes(offerData?.cred_def_id ?? '')
      ) {
        agent.credentials.acceptOffer({ credentialRecordId: record.id })
      }
    } catch (error: unknown) {
      /* noop */
    }
  }

  const handleMessageWithParam = (event: BaseEvent) => {
    if (!agent) {
      return
    }

    const { basicMessageRecord } = event.payload
    handleMessages(basicMessageRecord as BasicMessageRecord, agent)
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

  const start = async () => {
    if (!agent) {
      return
    }

    if (!messageSubscription) {
      const messageSub = agent.events
        .observable(BasicMessageEventTypes.BasicMessageStateChanged)
        .subscribe(handleMessageWithParam)
      setMessageSubscription(messageSub)
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
  }

  const stop = async () => {
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
  }

  const value = {
    start,
    stop,
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
