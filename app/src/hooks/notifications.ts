import {
  CredentialExchangeRecord as CredentialRecord,
  CredentialState,
  ProofExchangeRecord,
  ProofState,
} from '@aries-framework/core'
import { useCredentialByState, useProofByState } from '@aries-framework/react-hooks'
import { CredentialMetadata, customMetadata } from 'aries-bifold/App/types/metadata'
import { ProofCustomMetadata, ProofMetadata } from 'aries-bifold/verifier'

interface CustomNotification {
  type: 'CustomNotification'
  createdAt: Date
  id: string
}

interface Notifications {
  total: number
  notifications: Array<CredentialRecord | ProofExchangeRecord | CustomNotification>
}

export const useNotifications = (): Notifications => {
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const proofsRequested = useProofByState(ProofState.RequestReceived)
  const proofsDone = useProofByState([ProofState.Done, ProofState.PresentationReceived]).filter(
    (proof: ProofExchangeRecord) => {
      if (proof.isVerified === undefined) return false

      const metadata = proof.metadata.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      return !metadata?.details_seen
    }
  )
  const revoked = useCredentialByState(CredentialState.Done).filter((cred: CredentialRecord) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const metadata = cred!.metadata.get(CredentialMetadata.customMetadata) as customMetadata
    if (cred?.revocationNotification && metadata?.revoked_seen == undefined) {
      return cred
    }
  })

  const notifications = [...offers, ...proofsRequested, ...proofsDone, ...revoked].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return { total: notifications.length, notifications }
}
