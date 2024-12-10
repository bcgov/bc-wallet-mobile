import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds/build/utils/metadata'
import {
  BasicMessageRecord,
  CredentialExchangeRecord as CredentialRecord,
  CredentialState,
  ProofExchangeRecord,
  ProofState,
  SdJwtVcRecord,
  W3cCredentialRecord,
} from '@credo-ts/core'
import { useCredentialByState, useProofByState, useBasicMessages, useAgent } from '@credo-ts/react-hooks'
import { BifoldAgent, TOKENS, useServices, useStore } from '@hyperledger/aries-bifold-core'
import {
  CustomRecord,
  HistoryCardType,
  HistoryRecord,
  RecordType,
} from '@hyperledger/aries-bifold-core/App/modules/history/types'
import {
  BasicMessageMetadata,
  CredentialMetadata,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
} from '@hyperledger/aries-bifold-core/App/types/metadata'
import { CustomNotificationRecord } from '@hyperledger/aries-bifold-core/App/types/notification'
import { parseCredDefFromId } from '@hyperledger/aries-bifold-core/App/utils/cred-def'
import { getCredentialIdentifiers } from '@hyperledger/aries-bifold-core/App/utils/credential'
import { ProofCustomMetadata, ProofMetadata } from '@hyperledger/aries-bifold-verifier'
import { useCallback, useEffect, useState } from 'react'

import { attestationCredDefIds } from '../constants'
import { showPersonCredentialSelector } from '../helpers/BCIDHelper'
import { isProofRequestingAttestation } from '../services/attestation'
import { BCState } from '../store'

interface CustomNotification {
  type: 'CustomNotification'
  createdAt: Date
  id: string
}

export interface CustomMetadata extends ProofCustomMetadata {
  seenOnHome?: boolean
}

export interface BasicMessageCustomMetadata extends basicMessageCustomMetadata {
  seenOnHome?: boolean
}

export interface CredentialCustomMetadata extends credentialCustomMetadata {
  seenOnHome?: boolean
}

export type NotificationsInputProps = {
  openIDUri?: string
  isHome?: boolean
}

export type NotificationType =
  | BasicMessageRecord
  | CredentialRecord
  | ProofExchangeRecord
  | CustomNotificationRecord
  | SdJwtVcRecord
  | W3cCredentialRecord

export type NotificationReturnType = Array<NotificationType>

export const useNotifications = ({ isHome = true }: NotificationsInputProps): NotificationReturnType => {
  const { records: basicMessages } = useBasicMessages()
  const [notifications, setNotifications] = useState<NotificationReturnType>([])

  const credsReceived = useCredentialByState(CredentialState.CredentialReceived)
  const credsDone = useCredentialByState(CredentialState.Done)
  const proofsDone = useProofByState([ProofState.Done, ProofState.PresentationReceived])
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const proofsRequested = useProofByState(ProofState.RequestReceived)

  const { agent } = useAgent()
  const [store] = useStore<BCState>()
  const [nonAttestationProofs, setNonAttestationProofs] = useState<ProofExchangeRecord[]>([])
  const [logger, historyManagerCurried, historyEnabled] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.FN_LOAD_HISTORY,
    TOKENS.HISTORY_ENABLED,
  ])

  const logHistoryRecord = useCallback(
    async (credential: CredentialRecord) => {
      const connection = await agent?.connections.findById(credential?.connectionId ?? '')
      const correspondenceName = connection?.alias || connection?.theirLabel || credential.connectionId
      try {
        if (!(agent && historyEnabled)) {
          logger.trace(
            `[${useNotifications.name}]:[logHistoryRecord] Skipping history log, either history function disabled or agent undefined!`
          )
          return
        }
        const historyManager = historyManagerCurried(agent)

        const type = HistoryCardType.CardRevoked

        const events = await historyManager.getHistoryItems({ type: RecordType.HistoryRecord })
        if (
          events.some(
            (event: CustomRecord) => event.content.type === type && event.content.correspondenceId === credential.id
          )
        ) {
          return
        }
        const ids = getCredentialIdentifiers(credential)
        const name = parseCredDefFromId(ids.credentialDefinitionId, ids.schemaId)

        /** Save history record for card accepted */
        const recordData: HistoryRecord = {
          type: type,
          message: name,
          createdAt: new Date(),
          correspondenceId: credential.id,
          correspondenceName: correspondenceName,
        }
        await historyManager.saveHistory(recordData)
      } catch (err: unknown) {
        logger.error(`[${useNotifications.name}]:[logHistoryRecord] Error saving history: ${err}`)
      }
    },
    [agent, historyEnabled, logger, historyManagerCurried]
  )

  useEffect(() => {
    // get all unseen messages
    const unseenMessages: BasicMessageRecord[] = basicMessages.filter((msg) => {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as BasicMessageCustomMetadata
      return !meta?.seen && (!meta?.seenOnHome || !isHome)
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

    const receivedOffers: CredentialRecord[] = offers.filter((offer) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const metadata = offer.metadata.get(CredentialMetadata.customMetadata) as CredentialCustomMetadata
      return !metadata?.seenOnHome || !isHome
    })

    const revoked = credsDone.filter((cred: CredentialRecord) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const metadata = cred!.metadata.get(CredentialMetadata.customMetadata) as CredentialCustomMetadata
      if (
        cred?.revocationNotification &&
        metadata?.revoked_seen == undefined &&
        (metadata?.seenOnHome == undefined || !isHome)
      ) {
        logHistoryRecord(cred)
        return cred
      }
    })

    const credentials = [...credsDone, ...credsReceived]
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
    )

    const invitationDate = new Date(store.attestationAuthentification.createdAt)
    const custom: CustomNotification[] =
      showPersonCredentialSelector(credentialDefinitionIDs) &&
      !store.attestationAuthentification.isDismissed &&
      (!store.attestationAuthentification.isSeenOnHome || !isHome)
        ? [
            {
              id: store.attestationAuthentification.id,
              type: store.attestationAuthentification.type as 'CustomNotification',
              createdAt: invitationDate,
            },
          ]
        : []

    const proofs = nonAttestationProofs.filter((proof) => {
      return (
        (![ProofState.Done, ProofState.PresentationReceived].includes(proof.state) &&
          (!(proof.metadata.data[ProofMetadata.customMetadata] as CustomMetadata)?.seenOnHome || !isHome)) ||
        (proof.isVerified !== undefined &&
          !(proof.metadata.data[ProofMetadata.customMetadata] as CustomMetadata)?.details_seen &&
          (!(proof.metadata.data[ProofMetadata.customMetadata] as CustomMetadata)?.seenOnHome || !isHome))
      )
    })

    let notif = [...messagesToShow, ...custom, ...receivedOffers, ...proofs, ...revoked].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    notif = notif.filter((n) => !store.activities[n.id]?.isTempDeleted)

    setNotifications(isHome ? (notif.splice(0, 5) as never[]) : (notif as never[]))
  }, [
    offers,
    credsReceived,
    credsDone,
    basicMessages,
    nonAttestationProofs,
    store.attestationAuthentification.isDismissed,
    store.attestationAuthentification.isSeenOnHome,
    store.activities,
  ])

  useEffect(() => {
    Promise.all(
      [...proofsRequested, ...proofsDone].map(async (proof: ProofExchangeRecord) => {
        const isAttestation = await isProofRequestingAttestation(proof, agent as BifoldAgent, attestationCredDefIds)
        return {
          value: proof,
          include: !isAttestation,
        }
      })
    ).then((val) => setNonAttestationProofs(val.filter((v) => v.include).map((data) => data.value)))
  }, [proofsRequested, proofsDone])

  return notifications
}
