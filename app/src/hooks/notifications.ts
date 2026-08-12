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
  const proofRequestExpirationMs =
    store.preferences.proofRequestExpirationMs ?? ProofRequestExpirationTime.FortyEightHours

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

    const proofs = nonAttestationProofs.filter((proof) => {
      const isDone = doneStates.includes(proof.state)

      // Pending proof requests are usually abandoned once they get old (e.g. the user scanned
      // a new QR code), so they are removed from the list after their TTL passes. A TTL of 0
      // means the user has configured proof requests to never expire.
      if (
        !isDone &&
        proofRequestExpirationMs > 0 &&
        new Date(proof.createdAt).getTime() + proofRequestExpirationMs <= now
      ) {
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
    now,
    proofRequestExpirationMs,
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

  // Once a proof "expires" decline it
  useEffect(() => {
    if (!agent) {
      return
    }

    const expired = nonAttestationProofs.filter((proof) => {
      if (doneStates.includes(proof.state) || proofRequestExpirationMs <= 0) {
        return false
      }
      return new Date(proof.createdAt).getTime() + proofRequestExpirationMs <= now
    })

    expired.forEach((proof) => {
      if (decliningProofIds.current.has(proof.id)) {
        return
      }
      decliningProofIds.current.add(proof.id)
      declineProofRequest(agent, proof, t('ProofRequest.Declined')).finally(() => {
        decliningProofIds.current.delete(proof.id)
      })
    })
  }, [agent, nonAttestationProofs, doneStates, now, t, proofRequestExpirationMs])

  return notifications
}
