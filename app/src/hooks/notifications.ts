import { AttestationRestrictions, NOTIFICATION_REFRESH_INTERVAL_MS } from '@/constants'
import { declineProofRequest } from '@/hooks/useDeclineProofRequest'
import { BCState } from '@/store'
import {
  BasicMessageMetadata,
  CredentialMetadata,
  ProofRequestExpirationTime,
  basicMessageCustomMetadata,
  credentialCustomMetadata,
  useStore,
} from '@bifold/core'
import { useBasicMessages, useCredentialByState, useOptionalAgent, useProofByState } from '@bifold/react-hooks'
import { ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import {
  DidCommCredentialExchangeRecord as CredentialRecord,
  DidCommBasicMessageRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'
import { isProofRequestingAttestation } from '@services/attestation'
import { BCAgent } from '@utils/bc-agent-modules'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type CredentialNotificationRecord = DidCommBasicMessageRecord | CredentialRecord | DidCommProofExchangeRecord

/**
 * A pending proof request is considered expired once its TTL has elapsed. Requests that have
 * reached a done state never expire, and a TTL of 0 means the user has configured proof
 * requests to never expire.
 */
const isProofRequestExpired = (
  proof: DidCommProofExchangeRecord,
  doneStates: DidCommProofState[],
  proofRequestExpirationMs: number,
  now: number
): boolean => {
  if (doneStates.includes(proof.state) || proofRequestExpirationMs <= 0) {
    return false
  }
  return new Date(proof.createdAt).getTime() + proofRequestExpirationMs <= now
}

export const useNotifications = (): Array<CredentialNotificationRecord> => {
  const { agent } = useOptionalAgent<BCAgent>()
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
  const [now, setNow] = useState(() => Date.now())
  const { t } = useTranslation()
  const decliningProofIds = useRef<Set<string>>(new Set())
  const proofRequestExpirationMs = store.preferences.proofRequestExpirationMs ?? ProofRequestExpirationTime.OneHour

  // Single source of truth for which pending proof requests have aged out. Refetched on each tick
  // consumed both to hide them from the list and to decline them in dev mode.
  const expiredProofs = useMemo(
    () =>
      nonAttestationProofs.filter((proof) => isProofRequestExpired(proof, doneStates, proofRequestExpirationMs, now)),
    [nonAttestationProofs, doneStates, proofRequestExpirationMs, now]
  )

  // Tick periodically so time-based rules (proof request TTL, expiry warnings) are
  // re-evaluated while the notifications list stays mounted
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOTIFICATION_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

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

    const custom: { type: 'CustomNotification'; createdAt: Date; id: string }[] = []

    const expiredProofIds = new Set(expiredProofs.map((proof) => proof.id))
    const proofs = nonAttestationProofs.filter((proof) => {
      const isDone = doneStates.includes(proof.state)

      // Pending proof requests are usually abandoned once they get old (e.g. the user scanned
      // a new QR code), so they are removed from the list after their TTL passes.
      if (expiredProofIds.has(proof.id)) {
        return false
      }

      return (
        !isDone ||
        (proof.isVerified !== undefined &&
          !(proof.metadata.data[ProofMetadata.customMetadata] as ProofCustomMetadata)?.details_seen)
      )
    })
    const notif = [...messagesToShow, ...offers, ...proofs, ...revoked].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    setNotifications([...custom, ...notif] as never[])
  }, [
    offers,
    credsReceived,
    credsDone,
    basicMessages,
    nonAttestationProofs,
    doneStates,
    store.dismissPersonCredentialOffer.personCredentialOfferDismissed,
    expiredProofs,
  ])

  useEffect(() => {
    if (!agent) {
      return
    }

    Promise.all(
      [...proofsRequested, ...proofsDone].map(async (proof: DidCommProofExchangeRecord) => {
        const isAttestation = await isProofRequestingAttestation(proof, agent, AttestationRestrictions)
        return {
          value: proof,
          include: !isAttestation,
        }
      })
    ).then((val) => setNonAttestationProofs(val.filter((v) => v.include).map((data) => data.value)))
  }, [proofsRequested, proofsDone, agent])

  // Once a proof "expires" hide it from the notification list
  // If developer mode is active, auto decline the proof
  useEffect(() => {
    if (!store.preferences.developerModeEnabled || !agent) {
      return
    }

    expiredProofs.forEach((proof) => {
      if (decliningProofIds.current.has(proof.id)) {
        return
      }
      decliningProofIds.current.add(proof.id)
      declineProofRequest(agent, proof, t('ProofRequest.Declined')).finally(() => {
        decliningProofIds.current.delete(proof.id)
      })
    })
  }, [agent, expiredProofs, t, store.preferences.developerModeEnabled])

  return notifications
}
