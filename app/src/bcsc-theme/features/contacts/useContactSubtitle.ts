import {
  useBasicMessagesByConnectionId,
  useCredentialsByConnectionId,
  useProofsByConnectionId,
} from '@bifold/react-hooks'
import {
  DidCommCredentialExchangeRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const credentialEventLabel = (record: DidCommCredentialExchangeRecord): string => {
  switch (record.state) {
    case DidCommCredentialState.ProposalSent:
      return 'Chat.CredentialProposalSent'
    case DidCommCredentialState.OfferReceived:
      return 'Chat.CredentialOfferReceived'
    case DidCommCredentialState.RequestSent:
      return 'Chat.CredentialRequestSent'
    case DidCommCredentialState.Declined:
      return 'Chat.CredentialDeclined'
    case DidCommCredentialState.CredentialReceived:
    case DidCommCredentialState.Done:
      return 'Chat.CredentialReceived'
    default:
      return ''
  }
}

const proofEventLabel = (record: DidCommProofExchangeRecord): string => {
  switch (record.state) {
    case DidCommProofState.RequestSent:
    case DidCommProofState.ProposalReceived:
      return 'Chat.ProofRequestSent'
    case DidCommProofState.PresentationReceived:
      return 'Chat.ProofPresentationReceived'
    case DidCommProofState.RequestReceived:
      return 'Chat.ProofRequestReceived'
    case DidCommProofState.ProposalSent:
    case DidCommProofState.PresentationSent:
      return 'Chat.ProofRequestSatisfied'
    case DidCommProofState.Declined:
      return 'Chat.ProofRequestRejected'
    case DidCommProofState.Abandoned:
      return 'Chat.ProofRequestRejectReceived'
    case DidCommProofState.Done:
      return record.isVerified !== undefined ? 'Chat.ProofPresentationReceived' : 'Chat.ProofRequestSatisfied'
    default:
      return ''
  }
}

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
      const key = credentialEventLabel(c)
      if (key) {
        items.push({ createdAt: c.createdAt, text: t(key) })
      }
    }
    for (const p of proofs) {
      const key = proofEventLabel(p)
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
