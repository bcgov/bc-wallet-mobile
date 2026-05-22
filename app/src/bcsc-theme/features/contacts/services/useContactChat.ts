import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { getConnectionName, useStore } from '@bifold/core'
import {
  useBasicMessagesByConnectionId,
  useConnectionById,
  useCredentialsByConnectionId,
  useProofsByConnectionId,
} from '@bifold/react-hooks'
import { DidCommBasicMessageRecord } from '@credo-ts/didcomm'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { IMessage } from 'react-native-gifted-chat'

import {
  ChatItem,
  ChatNavigation,
  connectionToChatItem,
  credentialToChatItem,
  messageToChatItem,
  proofToChatItem,
} from './chat-items'

export const useContactChat = (connectionId: string, navigation: ChatNavigation) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)
  const basicMessages: DidCommBasicMessageRecord[] = useBasicMessagesByConnectionId(connectionId)
  const credentials = useCredentialsByConnectionId(connectionId)
  const proofs = useProofsByConnectionId(connectionId)

  const theirLabel = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const items: ChatItem[] = useMemo(() => {
    const out: ChatItem[] = []

    for (const m of basicMessages) {
      out.push(messageToChatItem(m, theirLabel))
    }

    for (const c of credentials) {
      const item = credentialToChatItem(c, t, navigation)
      if (item) {
        out.push(item)
      }
    }

    for (const p of proofs) {
      const item = proofToChatItem(p, t)
      if (item) {
        out.push(item)
      }
    }

    if (connection) {
      out.push(connectionToChatItem(connection, t))
    }

    // GiftedChat is inverted: newest first in the array (rendered nearest the composer).
    out.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
    return out
  }, [basicMessages, credentials, proofs, connection, theirLabel, t, navigation])

  const onSend = useCallback(
    async (sent: IMessage[]) => {
      if (!agent || !sent[0]?.text) {
        return
      }
      await agent.modules.didcomm.basicMessages.sendMessage(connectionId, sent[0].text)
    },
    [agent, connectionId]
  )

  return {
    items,
    theirLabel,
    onSend,
    isAgentReady: !!agent,
  }
}
