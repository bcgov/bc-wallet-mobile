import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRole,
  DidCommCredentialExchangeRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'

export type EventRole = 'me' | 'them'

export const credentialEventLabelKey = (record: DidCommCredentialExchangeRecord): string => {
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

export const proofEventLabelKey = (record: DidCommProofExchangeRecord): string => {
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
      return record.isVerified === undefined ? 'Chat.ProofRequestSatisfied' : 'Chat.ProofPresentationReceived'
    default:
      return ''
  }
}

export const credentialEventRole = (record: DidCommCredentialExchangeRecord): EventRole => {
  // Holder states: the wallet is the holder. OfferReceived is the only "them" state.
  return record.state === DidCommCredentialState.OfferReceived ? 'them' : 'me'
}

export const proofEventRole = (record: DidCommProofExchangeRecord): EventRole => {
  switch (record.state) {
    case DidCommProofState.PresentationReceived:
    case DidCommProofState.RequestReceived:
    case DidCommProofState.Abandoned:
      return 'them'
    case DidCommProofState.Done:
      return record.isVerified === undefined ? 'me' : 'them'
    default:
      return 'me'
  }
}

export const messageEventRole = (record: DidCommBasicMessageRecord): EventRole =>
  record.role === DidCommBasicMessageRole.Sender ? 'me' : 'them'
