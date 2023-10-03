import { Agent, BaseEvent, BasicMessageEventTypes, BasicMessageRecord, BasicMessageRole } from '@aries-framework/core'
import { useAgent } from '@aries-framework/react-hooks'
import { generateKey, appleAttestation } from '@hyperledger/aries-react-native-attestation'
import { Buffer } from 'buffer'
import React, { createContext, useContext, useState } from 'react'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Subscription } from 'rxjs'

enum Action {
  RequestAttestation = 'request_attestation',
  ChallengeResponse = 'challenge_response',
}

type InfrastructureMessage = {
  type: 'attestation'
  platform: 'apple'
  version: 1
  action: Action
}

type RequestIssuanceInfrastructureMessage = InfrastructureMessage & {
  nonce: string
}

type ChallengeResponseInfrastructureMessage = InfrastructureMessage & {
  key_id: string
  attestation_object: string
}

type AttestationProviderParams = {
  children: React.ReactNode
}

export type EventListenerFn = (event: BaseEvent) => void

export interface AttestationX {
  start: () => Promise<void>
  stop: () => Promise<void>
}

export const AttestationContext = createContext<AttestationX>(null as unknown as AttestationX)

export const AttestationProvider: React.FC<AttestationProviderParams> = ({ children }) => {
  const { agent } = useAgent()
  const [subscription, setSubscription] = useState<Subscription>()

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
      case Action.RequestAttestation: {
        try {
          const keyId = await generateKey()
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
        } catch (error: unknown) {
          return null
        }
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

  const handleMessageWithParam = (event: BaseEvent) => {
    if (!agent) {
      return
    }

    const { basicMessageRecord } = event.payload
    handleMessages(basicMessageRecord as BasicMessageRecord, agent)
  }

  const start = async () => {
    if (!agent) {
      return
    }

    if (subscription) {
      return
    }

    const sub = agent.events
      .observable(BasicMessageEventTypes.BasicMessageStateChanged)
      .subscribe(handleMessageWithParam)

    setSubscription(sub)
  }

  const stop = async () => {
    if (!subscription) {
      return
    }

    subscription.unsubscribe()
    setSubscription(undefined)
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
