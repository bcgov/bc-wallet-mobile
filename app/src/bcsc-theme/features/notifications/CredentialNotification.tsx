import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { CredentialNotificationRecord } from '@/hooks/notifications'
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
} from '@bifold/core'
import { useConnectionById } from '@bifold/react-hooks'
import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRepository,
  DidCommCredentialExchangeRecord,
  DidCommCredentialExchangeRepository,
} from '@credo-ts/didcomm'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

interface CredentialNotificationProps {
  notification: CredentialNotificationRecord
}

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

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const BasicMessageNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const basicMessage = notification as DidCommBasicMessageRecord
  const connection = useConnectionById(basicMessage.connectionId)
  const label = getConnectionName(connection, store.preferences.alternateContactNames)

  const handleClose = async () => {
    if (!agent) {
      return
    }
    const meta = basicMessage.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
    basicMessage.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    await repo.update(agent.context, basicMessage)
  }

  return (
    <NotificationCard
      title={t('Notification.BasicMessage.Title')}
      description={
        label ? t('Notification.BasicMessage.SentMessage', { label }) : t('Notification.BasicMessage.ReceivedMessage')
      }
      icon="chat"
      cardType={InfoBoxType.Info}
      onPress={() => navigation.navigate(BCSCScreens.ContactChat, { connectionId: basicMessage.connectionId })}
      onClose={handleClose}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CredentialOfferNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()

  return (
    <NotificationCard
      title={t('Notification.CredentialOffer.Title')}
      description={'TODO (V4.1.x): Dynamic content'}
      icon="card-membership"
      cardType={InfoBoxType.Info}
      onPress={() => {
        // FIXME (V4.1.x): Replace with credential offer navigation
      }}
      onClose={() => {
        // FIXME (V4.1.x): Replace with credential offer dismiss
      }}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ProofRequestNotification = ({ notification }: CredentialNotificationProps) => {
  const { t } = useTranslation()

  return (
    <NotificationCard
      title={t('Notification.ProofRequest.Title')}
      description={'TODO (V4.1.x): Dynamic content'}
      icon="assignment"
      cardType={InfoBoxType.Info}
      onPress={() => {
        // FIXME (V4.1.x): Replace with proof request navigation
      }}
      onClose={() => {
        // FIXME (V4.1.x): Replace with proof request dismiss
      }}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

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
      description={`${name}${version ? ` v${version}` : ''}`}
      icon="error"
      cardType={InfoBoxType.Error}
      onPress={() => navigation.navigate(Screens.CredentialDetails, { credentialId: credential.id })}
      onClose={handleClose}
      timestamp={formatTimestamp(notification.createdAt)}
    />
  )
}

export default CredentialNotification
