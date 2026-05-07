import { AttestationRestrictions } from '@/constants'
import {
  BasicMessageMetadata,
  BifoldAgent,
  CredentialMetadata,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
} from '@bifold/core'
import { useAgent, useBasicMessages, useCredentialByState, useProofByState } from '@bifold/react-hooks'
import { ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import {
  DidCommCredentialExchangeRecord as CredentialRecord,
  DidCommBasicMessageRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'
import { isProofRequestingAttestation } from '@services/attestation'
import { useEffect, useMemo, useState } from 'react'

export type CredentialNotificationRecord = DidCommBasicMessageRecord | CredentialRecord | DidCommProofExchangeRecord

export const useNotifications = (): Array<CredentialNotificationRecord> => {
  const { agent } = useAgent()
  const offers = useCredentialByState(DidCommCredentialState.OfferReceived)
  const proofsRequested = useProofByState(DidCommProofState.RequestReceived)
  const [nonAttestationProofs, setNonAttestationProofs] = useState<DidCommProofExchangeRecord[]>([])
  const [notifications, setNotifications] = useState([])
  const { records: basicMessages } = useBasicMessages()
  const credsReceived = useCredentialByState(DidCommCredentialState.CredentialReceived)
  const credsDone = useCredentialByState(DidCommCredentialState.Done)
  const doneStates = useMemo(
    () => [DidCommProofState.Done, DidCommProofState.PresentationReceived] as DidCommProofState[],
    []
  )
  const proofsDone = useProofByState(doneStates)

  useEffect(() => {
    // get all unseen messages
    const unseenMessages: DidCommBasicMessageRecord[] = basicMessages.filter((msg: DidCommBasicMessageRecord) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      return !meta?.seen
    })

    // add one unseen message per contact to notifications
    const contactsWithUnseenMessages: string[] = []
    const messagesToShow: DidCommBasicMessageRecord[] = []
    unseenMessages.forEach((msg: DidCommBasicMessageRecord) => {
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

    const proofs = nonAttestationProofs.filter((proof) => {
      return (
        ![DidCommProofState.Done, DidCommProofState.PresentationReceived].includes(proof.state) ||
        (proof.isVerified !== undefined &&
          !(proof.metadata.data[ProofMetadata.customMetadata] as ProofCustomMetadata)?.details_seen)
      )
    })
    const notif = [...messagesToShow, ...offers, ...proofs, ...revoked].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    setNotifications(notif as never[])
  }, [offers, credsReceived, credsDone, basicMessages, nonAttestationProofs])

  useEffect(() => {
    Promise.all(
      [...proofsRequested, ...proofsDone].map(async (proof: DidCommProofExchangeRecord) => {
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
