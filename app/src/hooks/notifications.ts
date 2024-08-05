import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds/build/utils/metadata'
import {
  BasicMessageRecord,
  CredentialExchangeRecord as CredentialRecord,
  CredentialState,
  ProofExchangeRecord,
  ProofState,
} from '@credo-ts/core'
import { useCredentialByState, useProofByState, useBasicMessages, useAgent } from '@credo-ts/react-hooks'
import { BifoldAgent, useStore } from '@hyperledger/aries-bifold-core'
import {
  BasicMessageMetadata,
  CredentialMetadata,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
} from '@hyperledger/aries-bifold-core/App/types/metadata'
import { ProofCustomMetadata, ProofMetadata } from '@hyperledger/aries-bifold-verifier'
import { useEffect, useState } from 'react'

import { AttestationRestrictions } from '../constants'
import { showPersonCredentialSelector } from '../helpers/BCIDHelper'
import { isProofRequestingAttestation } from '../services/attestation'
import { BCState } from '../store'

export const useNotifications = (): Array<BasicMessageRecord | CredentialRecord | ProofExchangeRecord> => {
  const { agent } = useAgent()
  const [store] = useStore<BCState>()
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const proofsRequested = useProofByState(ProofState.RequestReceived)
  const [nonAttestationProofs, setNonAttestationProofs] = useState<ProofExchangeRecord[]>([])
  const [notifications, setNotifications] = useState([])
  const { records: basicMessages } = useBasicMessages()

  const credsReceived = useCredentialByState(CredentialState.CredentialReceived)
  const credsDone = useCredentialByState(CredentialState.Done)
  const proofsDone = useProofByState([ProofState.Done, ProofState.PresentationReceived])

  useEffect(() => {
    // get all unseen messages
    const unseenMessages: BasicMessageRecord[] = basicMessages.filter((msg) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      return !meta?.seen
    })

    // add one unseen message per contact to notifications
    const contactsWithUnseenMessages: string[] = []
    const messagesToShow: BasicMessageRecord[] = []
    unseenMessages.forEach((msg) => {
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

    const notif = [...messagesToShow, ...offers, ...nonAttestationProofs, ...revoked].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const notificationsWithCustom = [...custom, ...notif]
    setNotifications(notificationsWithCustom as never[])
  }, [credsReceived, credsDone, basicMessages, nonAttestationProofs])

  useEffect(() => {
    const validProofsDone = proofsDone.filter((proof: ProofExchangeRecord) => {
      if (proof.isVerified === undefined) return false

      const metadata = proof.metadata.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      return !metadata?.details_seen
    })
    Promise.all(
      [...proofsRequested, ...validProofsDone].map(async (proof: ProofExchangeRecord) => {
        const isAttestation = await isProofRequestingAttestation(proof, agent as BifoldAgent, AttestationRestrictions)
        return {
          value: proof,
          include: !isAttestation,
        }
      })
    ).then((val) => setNonAttestationProofs(val.filter((v) => v.include).map((data) => data.value)))
  }, [proofsRequested, proofsDone])

  return notifications
}
