import { showPersonCredentialSelector } from '@/bcwallet-theme/features/person-flow/utils/BCIDHelper'
import { AttestationRestrictions } from '@/constants'
import { BCState } from '@/store'
import {
  BasicMessageMetadata,
  BifoldAgent,
  CredentialMetadata,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
  useStore,
} from '@bifold/core'
import { useAgent, useBasicMessages, useCredentialByState, useProofByState } from '@bifold/react-hooks'
import { ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds'
import {
  DidCommCredentialExchangeRecord as CredentialRecord,
  DidCommBasicMessageRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'
import { isProofRequestingAttestation } from '@services/attestation'
import { useEffect, useMemo, useState } from 'react'

export const useNotifications = (): Array<
  DidCommBasicMessageRecord | CredentialRecord | DidCommProofExchangeRecord | 'CustomNotification'
> => {
  const { agent } = useAgent()
  const [store] = useStore<BCState>()
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

    const credentials = [...credsDone, ...credsReceived]
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
    )
    const invitationDate = new Date()
    const custom =
      showPersonCredentialSelector(credentialDefinitionIDs) &&
      !store.dismissPersonCredentialOffer.personCredentialOfferDismissed
        ? [{ type: 'CustomNotification', createdAt: invitationDate, id: 'custom' }]
        : []
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

    const notificationsWithCustom = [...custom, ...notif]
    setNotifications(notificationsWithCustom as never[])
  }, [
    offers,
    credsReceived,
    credsDone,
    basicMessages,
    nonAttestationProofs,
    store.dismissPersonCredentialOffer.personCredentialOfferDismissed,
  ])

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
