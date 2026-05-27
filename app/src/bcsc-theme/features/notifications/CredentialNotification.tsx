import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
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
  InfoBoxType,
  parsedSchema,
  Screens,
  useStore,
  useTheme,
} from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import { markProofAsViewed } from '@bifold/verifier'
import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRepository,
  DidCommCredentialExchangeRecord,
  DidCommCredentialExchangeRepository,
  DidCommProofExchangeRecord,
  DidCommProofState,
  DidCommRequestPresentationV2Message,
} from '@credo-ts/didcomm'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

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

/**
 * Helper function to format timestamps in a user-friendly way (e.g., "Just now", "5 minutes ago", "Today at 3:45 PM").
 *
 * @param {Date} date
 * @return {*}  {string}
 */
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) {
    return 'Just now'
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatExpiryBadge(expiresTime: Date): string | undefined {
  const diffMs = expiresTime.getTime() - Date.now()
  if (diffMs <= 0) {
    return 'Expired'
  }
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) {
    return `Expires in ${diffMin} min`
  }
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`
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
  const [unseenCount, setUnseenCount] = useState(0)

  useEffect(() => {
    if (!agent) return
    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    repo.findByQuery(agent.context, { connectionId: basicMessage.connectionId }).then((messages) => {
      const count = messages.filter((msg) => {
        const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
        return !meta?.seen
      }).length
      setUnseenCount(count)
    })
  }, [agent, basicMessage.connectionId])

  const handleClose = async () => {
    if (!agent) {
      return
    }
    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    const allMessages = await repo.findByQuery(agent.context, { connectionId: basicMessage.connectionId })
    for (const msg of allMessages) {
      const meta = msg.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
      if (!meta?.seen) {
        msg.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
        await repo.update(agent.context, msg)
      }
    }
  }

  return (
    <NotificationCard
      title={t('Notification.BasicMessage.Title')}
      description={
        label ? t('Notification.BasicMessage.SentMessage', { label }) : t('Notification.BasicMessage.ReceivedMessage')
      }
      icon="chat"
      cardType={InfoBoxType.Info}
      onPress={() => {
        handleClose()
        navigation.navigate(BCSCScreens.ContactChat, { connectionId: basicMessage.connectionId })
      }}
      onClose={handleClose}
      badge={unseenCount > 1 ? `${unseenCount} messages` : undefined}
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
  const { ColorPalette } = useTheme()
  const [store] = useStore()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const credential = notification as DidCommCredentialExchangeRecord
  const connection = useConnectionById(credential.connectionId ?? '')
  const { name, version } = parsedSchema(credential)
  const label = getConnectionName(connection, store.preferences.alternateContactNames)
  const [expiresTime, setExpiresTime] = useState<Date>()

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

  const handleClose = useDeclineCredentialOffer(credential)

  return (
    <NotificationCard
      title={t('Notification.CredentialOffer.Title')}
      description={description}
      icon="card-membership"
      cardType={InfoBoxType.Info}
      backgroundColor={ColorPalette.grayscale.white}
      onPress={() => navigation.navigate(BCSCScreens.ConnectionLoading, { credentialId: credential.id })}
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

  const handlePress = () => {
    if (isDone && agent) {
      markProofAsViewed(agent, proof)
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
      icon="assignment"
      cardType={InfoBoxType.Info}
      onPress={handlePress}
      onClose={handleClose}
      badge={expiresTime ? formatExpiryBadge(expiresTime) : undefined}
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
      icon="error"
      cardType={InfoBoxType.Error}
      onPress={() => navigation.navigate(Screens.CredentialDetails, { credentialId: credential.id })}
      onClose={handleClose}
      timestamp={formatTimestamp(notification.updatedAt ?? notification.createdAt)}
    />
  )
}

export default CredentialNotification
