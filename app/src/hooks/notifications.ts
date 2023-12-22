import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import {
  BasicMessageRecord,
  CredentialExchangeRecord as CredentialRecord,
  CredentialState,
  ProofExchangeRecord,
  ProofState,
} from '@aries-framework/core'
import { useCredentialByState, useProofByState, useBasicMessages } from '@aries-framework/react-hooks'
import { useStore } from '@hyperledger/aries-bifold-core'
import {
  BasicMessageMetadata,
  CredentialMetadata,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
} from '@hyperledger/aries-bifold-core/App/types/metadata'
//aries-bifold/App/types/metadata
import { ProofCustomMetadata, ProofMetadata } from '@hyperledger/aries-bifold-verifier'

import { getUnlockCredentialDate, showPersonCredentialSelector } from '../helpers/BCIDHelper'
import { BCState } from '../store'
interface CustomNotification {
  type: 'CustomNotification'
  createdAt: Date
  id: string
}

interface Notifications {
  total: number
  notifications: Array<BasicMessageRecord | CredentialRecord | ProofExchangeRecord | CustomNotification>
}

export const useNotifications = (): Notifications => {
  const [store] = useStore<BCState>()
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const proofsRequested = useProofByState(ProofState.RequestReceived)
  const { records: basicMessages } = useBasicMessages()
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
  const proofsDone = useProofByState([ProofState.Done, ProofState.PresentationReceived]).filter(
    (proof: ProofExchangeRecord) => {
      if (proof.isVerified === undefined) return false

      const metadata = proof.metadata.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      return !metadata?.details_seen
    }
  )
  const revoked = useCredentialByState(CredentialState.Done).filter((cred: CredentialRecord) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const metadata = cred!.metadata.get(CredentialMetadata.customMetadata) as credentialCustomMetadata
    if (cred?.revocationNotification && metadata?.revoked_seen == undefined) {
      return cred
    }
  })

  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const credentialDefinitionIDs = credentials.map(
    (c) => c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
  )
  const invitationDate = getUnlockCredentialDate(credentials)
  const custom: CustomNotification[] =
    showPersonCredentialSelector(credentialDefinitionIDs) &&
    invitationDate &&
    !store.dismissPersonCredentialOffer.personCredentialOfferDismissed
      ? [{ type: 'CustomNotification', createdAt: invitationDate, id: 'custom' }]
      : []

  let notifications: (BasicMessageRecord | CredentialRecord | ProofExchangeRecord | CustomNotification)[] = [
    ...messagesToShow,
    ...offers,
    ...proofsRequested,
    ...proofsDone,
    ...revoked,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  notifications = [...custom, ...notifications]

  return { total: notifications.length, notifications }
}
