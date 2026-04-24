import { AttestationRestrictions } from '@/constants'
import { BCState } from '@/store'
import {
  BasicMessageMetadata,
  BifoldAgent,
  CredentialMetadata,
  NotificationListItem,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
  useStore,
} from '@bifold/core'
import { useBasicMessages, useCredentialByState, useProofByState } from '@bifold/react-hooks'
import { ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import {
  BasicMessageRecord,
  CredentialExchangeRecord as CredentialRecord,
  CredentialState,
  ProofExchangeRecord,
  ProofState,
} from '@credo-ts/core'
import { isProofRequestingAttestation } from '@services/attestation'
import { useEffect, useMemo, useState } from 'react'
import useBCAgentSetup from './useBCAgentSetup'

export enum CustomNotificationID {
  BCSCStartVerification = 'BCSCStartVerification',
}

type NotificationItemListProps = React.ComponentProps<typeof NotificationListItem>
export type CustomNotificationConfig = NonNullable<NotificationItemListProps['customNotification']>
type CredentialNotification = NotificationItemListProps['notification']

export const useNotifications = (): Array<CredentialNotification> => {
  // FIXME (V4.1.x): Previously we were using useAgent, but it will throw if agent in not initialized. We need agent init to be non blocking for BCSC features.
  const { agent } = useBCAgentSetup()
  const [store] = useStore<BCState>()
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const proofsRequested = useProofByState(ProofState.RequestReceived)
  const [nonAttestationProofs, setNonAttestationProofs] = useState<ProofExchangeRecord[]>([])
  const [notifications, setNotifications] = useState([])
  const { records: basicMessages } = useBasicMessages()
  const credsReceived = useCredentialByState(CredentialState.CredentialReceived)
  const credsDone = useCredentialByState(CredentialState.Done)
  const doneStates = useMemo(() => [ProofState.Done, ProofState.PresentationReceived] as ProofState[], [])
  const proofsDone = useProofByState(doneStates)

  useEffect(() => {
    // get all unseen messages
    const unseenMessages: BasicMessageRecord[] = basicMessages.filter((msg: BasicMessageRecord) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      return !meta?.seen
    })

    // add one unseen message per contact to notifications
    const contactsWithUnseenMessages: string[] = []
    const messagesToShow: BasicMessageRecord[] = []
    unseenMessages.forEach((msg: BasicMessageRecord) => {
      if (!contactsWithUnseenMessages.includes(msg.connectionId)) {
        contactsWithUnseenMessages.push(msg.connectionId)
        messagesToShow.push(msg)
      }
    })

    const revoked = credsDone.filter((cred: CredentialRecord) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const metadata = cred!.metadata.get(CredentialMetadata.customMetadata) as credentialCustomMetadata
      if (cred?.revocationNotification && metadata?.revoked_seen == undefined) {
        return cred
      }
    })

    const customNotifications: CredentialNotification[] = []
    if (store.bcscSecure.verified === false) {
      customNotifications.push({
        type: 'CustomNotification',
        createdAt: new Date(),
        id: CustomNotificationID.BCSCStartVerification,
      })
    }

    const proofs = nonAttestationProofs.filter((proof) => {
      return (
        ![ProofState.Done, ProofState.PresentationReceived].includes(proof.state) ||
        (proof.isVerified !== undefined &&
          !(proof.metadata.data[ProofMetadata.customMetadata] as ProofCustomMetadata)?.details_seen)
      )
    })
    const notif = [...messagesToShow, ...offers, ...proofs, ...revoked].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const notificationsWithCustom = [...customNotifications, ...notif]
    setNotifications(notificationsWithCustom as never[])
  }, [
    offers,
    credsReceived,
    credsDone,
    basicMessages,
    nonAttestationProofs,
    store.dismissPersonCredentialOffer.personCredentialOfferDismissed,
    store.bcscSecure.verified,
  ])

  useEffect(() => {
    if (!agent) {
      return
    }

    Promise.all(
      [...proofsRequested, ...proofsDone].map(async (proof: ProofExchangeRecord) => {
        const isAttestation = await isProofRequestingAttestation(proof, agent as BifoldAgent, AttestationRestrictions)
        return {
          value: proof,
          include: !isAttestation,
        }
      })
    ).then((val) => setNonAttestationProofs(val.filter((v) => v.include).map((data) => data.value)))
  }, [proofsRequested, proofsDone, agent])

  return notifications
}
