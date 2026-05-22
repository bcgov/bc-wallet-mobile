import {
  useBasicMessagesByConnectionId,
  useCredentialsByConnectionId,
  useProofsByConnectionId,
} from '@bifold/react-hooks'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { credentialEventLabelKey, proofEventLabelKey } from './chat-events'

/**
 * Custom hook to generate a subtitle for a contact based on the most recent interaction,
 *
 * @param {string} connectionId
 * @return {*}  {(string | undefined)}
 */
export const useContactSubtitle = (connectionId: string): string | undefined => {
  const { t } = useTranslation()
  const basicMessages = useBasicMessagesByConnectionId(connectionId)
  const credentials = useCredentialsByConnectionId(connectionId)
  const proofs = useProofsByConnectionId(connectionId)

  return useMemo(() => {
    type Item = { createdAt: Date; text: string }
    const items: Item[] = []

    for (const m of basicMessages) {
      if (m.content) {
        items.push({ createdAt: m.createdAt, text: m.content })
      }
    }
    for (const c of credentials) {
      const key = credentialEventLabelKey(c)
      if (key) {
        items.push({ createdAt: c.createdAt, text: t(key) })
      }
    }
    for (const p of proofs) {
      const key = proofEventLabelKey(p)
      if (key) {
        items.push({ createdAt: p.createdAt, text: t(key) })
      }
    }

    if (items.length === 0) {
      return undefined
    }
    items.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())
    return items[0].text
  }, [basicMessages, credentials, proofs, t])
}
