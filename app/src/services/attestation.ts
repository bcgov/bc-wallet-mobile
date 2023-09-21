import { Agent, BaseEvent, BasicMessageEventTypes, BasicMessageRecord, BasicMessageRole } from '@aries-framework/core'
import { generateKey, appleAttestationAsBase64 } from '@fullboar/react-native-attestation'
import { Buffer } from 'buffer'

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

const decodeInfrastructureMessage = (record: BasicMessageRecord): InfrastructureMessage | null => {
  try {
    const decoded = Buffer.from(record.content, 'base64').toString('utf-8')
    const message = JSON.parse(decoded)

    return message
  } catch (error) {
    return null
  }
}

const handleInfrastructureMessage = async (
  message: InfrastructureMessage
): Promise<ChallengeResponseInfrastructureMessage | null> => {
  switch (message.action) {
    case Action.RequestAttestation: {
      console.log('processing request for attestation')

      try {
        console.log('generating key')
        const keyId = await generateKey()
        console.log('keyId = ', keyId)

        console.log('generating attestation')
        const attestationAsBuffer = await appleAttestationAsBase64(
          keyId,
          (message as RequestIssuanceInfrastructureMessage).nonce
        )
        const attestationResponse = {
          type: 'attestation',
          platform: 'apple',
          version: 1,
          action: Action.ChallengeResponse,
          key_id: keyId,
          attestation_object: attestationAsBuffer.toString('base64'),
        }
        console.log('returning attestation object')

        return attestationResponse
      } catch (error: unknown) {
        console.log('error processing infra message = ', (error as Error).message)
        return null
      }
    }

    default:
      return null
  }
}

export const handleMessages = async (message: BasicMessageRecord, agent: Agent): Promise<void> => {
  if (message.role === BasicMessageRole.Sender) {
    // We don't want to process or keep messages from
    // ourselves
    agent?.basicMessages.deleteById(message.id)
    return
  }

  if (!isInfrastructureMessage(message)) {
    // We don't care about non-infrastructure messages
    return
  }

  console.log(`processing message ${message.id}, role = ${message.role}`)

  const imessage = decodeInfrastructureMessage(message)
  if (!imessage) {
    return
  }

  const result = await handleInfrastructureMessage(imessage)

  if (result) {
    const responseMessageContent = Buffer.from(JSON.stringify(result)).toString('base64')
    console.log('sending response message')
    await agent?.basicMessages.sendMessage(message.connectionId, responseMessageContent)
    console.log('sent response message')
  }

  console.log('deleting message')
  await agent?.basicMessages.deleteById(message.id)
  console.log('deleted message')
}

export const startAttestationMonitor = async (agent: Agent): Promise<void> => {
  const handleMessageWithParam = (event: BaseEvent) => {
    const { basicMessageRecord } = event.payload
    handleMessages(basicMessageRecord as BasicMessageRecord, agent)
  }

  agent?.events.on(BasicMessageEventTypes.BasicMessageStateChanged, handleMessageWithParam)
}

export const stopAttestationMonitor = async (agent: Agent): Promise<void> => {
  const handleMessageWithParam = (event: BaseEvent) => {
    const { basicMessageRecord } = event.payload
    handleMessages(basicMessageRecord as BasicMessageRecord, agent)
  }

  agent?.events.off(BasicMessageEventTypes.BasicMessageStateChanged, handleMessageWithParam)
}
