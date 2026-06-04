import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { formatExpiryBadge, formatTimestamp } from '@/bcsc-theme/utils/datetime-utils'
import { NOTIFICATION_EXPIRY_WARNING_WINDOW_MS, PROOF_REQUEST_NOTIFICATION_TTL_MS } from '@/constants'
import { CredentialNotificationRecord } from '@/hooks/notifications'
import { useDeclineCredentialOffer } from '@/hooks/useDeclineCredentialOffer'
import { useDeclineProofRequest } from '@/hooks/useDeclineProofRequest'
import { getCredentialNotificationType, NotificationType } from '@/utils/credentials'
import {
  basicMessageCustomMetadata,
  BasicMessageMetadata,
  credentialCustomMetadata,
  CredentialMetadata,
  getConnectionName,
  parsedSchema,
  Screens,
  useStore,
} from '@bifold/core'
import { useBasicMessages, useConnectionById } from '@bifold/react-hooks'
import { markProofAsViewed, ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRepository,
  DidCommCredentialExchangeRecord,
  DidCommCredentialExchangeRepository,
  DidCommProofExchangeRecord,
  DidCommProofExchangeRepository,
  DidCommProofState,
  DidCommRequestPresentationV2Message,
} from '@credo-ts/didcomm'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

interface CredentialNotificationProps {
  notification: CredentialNotificationRecord
}

/**
 * CredentialNotification component that renders different types of notifications based on the notification type.
 *
 * @param {CredentialNotificationProps} props
 * @return {*}
 */
const CredentialNotification = (props: CredentialNotificationProps) => {
  const notificationType = getCredentialNotificationType(props.notification)

  switch (notificationType) {
    case NotificationType.BasicMessage:
      return <BasicMessageNotification {...props} />
    case NotificationType.CredentialOffer:
      return <CredentialOfferNotification {...props} />
    case NotificationType.ProofRequest:
      return <ProofRequestNotification {...props} />
    case NotificationType.Revocation:
      return <RevocationNotification {...props} />
    default:
      return null
  }
}

/** App-level additions to bifold's basic message custom metadata for notification read tracking. */
interface NotificationBasicMessageMetadata extends basicMessageCustomMetadata {
  notification_read?: boolean
}

/** App-level additions to bifold's credential custom metadata for notification read tracking. */
interface NotificationCredentialMetadata extends credentialCustomMetadata {
  offer_seen?: boolean
}

/** App-level additions to bifold's proof custom metadata for notification read tracking. */
interface NotificationProofMetadata extends ProofCustomMetadata {
  request_seen?: boolean
}

/**
 * Resolve the card status for time-sensitive notifications: items at or near expiry need
 * attention regardless of read state, otherwise blue when unread and white when read.
 *
 * @param {boolean} read Whether the user has opened the notification
 * @param {Date} [expiresTime] When the notification expires, if it does
 * @return {*}  {NotificationCardStatus}
 */
function getTimeSensitiveStatus(read: boolean, expiresTime?: Date): NotificationCardStatus {
  if (expiresTime && expiresTime.getTime() - Date.now() <= NOTIFICATION_EXPIRY_WARNING_WINDOW_MS) {
    return NotificationCardStatus.Attention
  }
  return read ? NotificationCardStatus.Read : NotificationCardStatus.Unread
}

/**
 * Basic Message Notifications
 *
 * @param {CredentialNotificationProps} { notification }
 * @return {*}
 */
const BasicMessageNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const basicMessage = notification as DidCommBasicMessageRecord
  const connection = useConnectionById(basicMessage.connectionId)
  const label = getConnectionName(connection, store.preferences.alternateContactNames)
  const { records: basicMessages } = useBasicMessages()

  // Messages for this contact the user hasn't dismissed — the list shows one
  // notification per contact, so this card represents all of them
  const unseenMessages = useMemo(
    () =>
      basicMessages.filter((msg) => {
        if (msg.connectionId !== basicMessage.connectionId) {
          return false
        }
        const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as NotificationBasicMessageMetadata
        return !meta?.seen
      }),
    [basicMessages, basicMessage.connectionId]
  )

  // Read (white) once the user has opened the chat for every message in this card —
  // a new incoming message flips the notification back to unread (blue)
  const isRead =
    unseenMessages.length > 0 &&
    unseenMessages.every(
      (msg) =>
        (msg.metadata.get(BasicMessageMetadata.customMetadata) as NotificationBasicMessageMetadata)?.notification_read
    )

  // Flip the notification from unread to read once the user opens the chat;
  // the notification stays in the list until dismissed
  const markRead = async () => {
    if (!agent) {
      return
    }
    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    for (const msg of unseenMessages) {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as NotificationBasicMessageMetadata
      if (!meta?.notification_read) {
        msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, notification_read: true })
        await repo.update(agent.context, msg)
      }
    }
  }

  // Dismissing the notification marks the messages seen, which removes it from the list
  const handleClose = async () => {
    if (!agent) {
      return
    }
    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    for (const msg of unseenMessages) {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as NotificationBasicMessageMetadata
      msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
      await repo.update(agent.context, msg)
    }
  }

  return (
    <NotificationCard
      title={t('Notification.BasicMessage.Title')}
      description={
        label ? t('Notification.BasicMessage.SentMessage', { label }) : t('Notification.BasicMessage.ReceivedMessage')
      }
      icon="tray-arrow-down"
      logoUrl={connection?.imageUrl}
      status={isRead ? NotificationCardStatus.Read : NotificationCardStatus.Unread}
      onPress={() => {
        markRead()
        navigation.navigate(BCSCScreens.ContactChat, { connectionId: basicMessage.connectionId })
      }}
      onClose={handleClose}
      badge={unseenMessages.length > 1 ? `${unseenMessages.length} messages` : undefined}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

/**
 * Credential Offer Notifications
 *
 * @param {CredentialNotificationProps} { notification }
 * @return {*}
 */
const CredentialOfferNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const credential = notification as DidCommCredentialExchangeRecord
  const connection = useConnectionById(credential.connectionId ?? '')
  const { name, version } = parsedSchema(credential)
  const label = getConnectionName(connection, store.preferences.alternateContactNames)
  const [expiresTime, setExpiresTime] = useState<Date>()

  const offerMeta = credential.metadata.get(CredentialMetadata.customMetadata) as NotificationCredentialMetadata | null
  const isRead = Boolean(offerMeta?.offer_seen)

  useEffect(() => {
    const fetchTiming = async () => {
      try {
        const message = await agent?.modules.didcomm.credentials.findOfferMessage(credential.id)
        if (message?.timing?.expiresTime) {
          setExpiresTime(message.timing.expiresTime)
        }
      } catch {
        // timing is optional, ignore errors
      }
    }
    fetchTiming()
  }, [agent, credential.id])

  const credentialDisplayName = version ? `${name} v${version}` : name
  const description = label
    ? t('Notification.CredentialOffer.Description', { label, credential: credentialDisplayName })
    : credentialDisplayName

  // Flip the notification from unread to read once the user opens it
  const markOfferSeen = async () => {
    if (!agent || isRead) {
      return
    }
    const meta = credential.metadata.get(CredentialMetadata.customMetadata) as NotificationCredentialMetadata
    credential.metadata.set(CredentialMetadata.customMetadata, { ...meta, offer_seen: true })
    const repo = agent.context.dependencyManager.resolve(DidCommCredentialExchangeRepository)
    await repo.update(agent.context, credential)
  }

  const handleClose = useDeclineCredentialOffer(credential)

  return (
    <NotificationCard
      title={t('Notification.CredentialOffer.Title')}
      description={description}
      icon="tray-arrow-down"
      logoUrl={connection?.imageUrl}
      status={getTimeSensitiveStatus(isRead, expiresTime)}
      onPress={() => {
        markOfferSeen()
        navigation.navigate(BCSCScreens.ConnectionLoading, { credentialId: credential.id })
      }}
      onClose={handleClose}
      badge={expiresTime ? formatExpiryBadge(expiresTime) : undefined}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

/**
 * Proof Request Notifications
 *
 * @param {CredentialNotificationProps} { notification }
 * @return {*}
 */
const ProofRequestNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const proof = notification as DidCommProofExchangeRecord
  const connection = useConnectionById(proof.connectionId ?? '')
  const label = getConnectionName(connection, store.preferences.alternateContactNames)
  const [proofName, setProofName] = useState('')
  const [expiresTime, setExpiresTime] = useState<Date>()

  useEffect(() => {
    const fetchProofDetails = async () => {
      try {
        const message = await agent?.didcomm.proofs.findRequestMessage(proof.id)
        if (message?.timing?.expiresTime) {
          setExpiresTime(message.timing.expiresTime)
        }
        if (message instanceof DidCommRequestPresentationV2Message) {
          const attachment = message.requestAttachments.find((a) => a.id === 'indy')
          const name = attachment?.getDataAsJson<{ name?: string }>()?.name
          if (name) {
            setProofName(name)
            return
          }
        }
        if (message?.comment) {
          setProofName(message.comment)
        }
      } catch (err) {
        agent?.config.logger.error(`Failed to fetch proof request details: ${err}`)
      }
    }
    fetchProofDetails()
  }, [agent, proof.id])

  const description =
    proofName ||
    (label ? t('Notification.ProofRequest.Description', { label }) : t('Notification.ProofRequest.DefaultDescription'))

  const isDone = proof.state === DidCommProofState.Done || proof.state === DidCommProofState.PresentationReceived
  const declineProofRequest = useDeclineProofRequest(proof)

  const proofMeta = proof.metadata.get(ProofMetadata.customMetadata) as NotificationProofMetadata | null
  // Done proofs only stay in the list until their outcome has been viewed, so treat them as unread
  const isRead = !isDone && Boolean(proofMeta?.request_seen)

  // Pending proof requests are short-lived: they are removed from the list once their TTL
  // passes (see useNotifications), so warn about the protocol expiry or the app-imposed
  // removal time, whichever comes first. Expiry is moot once the proof is done.
  const removalTime = new Date(new Date(proof.createdAt).getTime() + PROOF_REQUEST_NOTIFICATION_TTL_MS)
  const effectiveExpiry = isDone ? undefined : expiresTime && expiresTime < removalTime ? expiresTime : removalTime

  // Flip the notification from unread to read once the user opens it
  const markRequestSeen = async () => {
    if (!agent || isRead) {
      return
    }
    const meta = proof.metadata.get(ProofMetadata.customMetadata) as NotificationProofMetadata
    proof.metadata.set(ProofMetadata.customMetadata, { ...meta, request_seen: true })
    const repo = agent.context.dependencyManager.resolve(DidCommProofExchangeRepository)
    await repo.update(agent.context, proof)
  }

  const handlePress = () => {
    if (isDone && agent) {
      markProofAsViewed(agent, proof)
    } else {
      markRequestSeen()
    }
    navigation.navigate(BCSCScreens.ConnectionLoading, { proofId: proof.id })
  }

  const handleClose = async () => {
    if (isDone && agent) {
      markProofAsViewed(agent, proof)
    } else {
      await declineProofRequest()
    }
  }

  return (
    <NotificationCard
      title={t('Notification.ProofRequest.Title')}
      description={description}
      icon="file-download"
      logoUrl={connection?.imageUrl}
      status={getTimeSensitiveStatus(isRead, effectiveExpiry)}
      onPress={handlePress}
      onClose={handleClose}
      badge={effectiveExpiry ? formatExpiryBadge(effectiveExpiry) : undefined}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

/**
 * Revocation Notifications
 *
 * @param {CredentialNotificationProps} { notification }
 * @return {*}
 */
const RevocationNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const credential = notification as DidCommCredentialExchangeRecord
  const connection = useConnectionById(credential.connectionId ?? '')
  const { name, version } = parsedSchema(credential)

  const handleClose = async () => {
    if (!agent) {
      return
    }
    const meta = credential.metadata.get(CredentialMetadata.customMetadata) as credentialCustomMetadata
    credential.metadata.set(CredentialMetadata.customMetadata, { ...meta, revoked_seen: true })
    const repo = agent.context.dependencyManager.resolve(DidCommCredentialExchangeRepository)
    await repo.update(agent.context, credential)
  }

  return (
    <NotificationCard
      title={t('Notification.Revocation.Title')}
      description={version ? `${name} v${version}` : name}
      icon="alert-circle"
      logoUrl={connection?.imageUrl}
      // Revoked credentials require immediate attention, per the designs
      status={NotificationCardStatus.Warning}
      onPress={() => navigation.navigate(Screens.CredentialDetails, { credentialId: credential.id })}
      onClose={handleClose}
      timestamp={formatTimestamp(notification.updatedAt ?? notification.createdAt)}
    />
  )
}

export default CredentialNotification
