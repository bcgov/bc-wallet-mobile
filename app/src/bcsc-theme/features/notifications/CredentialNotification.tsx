import { CredentialNotificationRecord } from '@/hooks/notifications'
import { getCredentialNotificationType, NotificationType } from '@/utils/credentials'
import { InfoBoxType } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

interface CredentialNotificationProps {
  notification: CredentialNotificationRecord
}

/**
 * CredentialNotification is a component that renders different types of credential-related notifications based on the notification type.
 *
 * @param props - The properties for the CredentialNotification component, including the notification record.
 * @returns React.Element - The rendered CredentialNotification component, which conditionally renders specific notification cards based on the notification type.
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
    // TODO (V4.1.x): Add Proof notification
    default:
      return null
  }
}

const BasicMessageNotification = (_props: CredentialNotificationProps) => {
  const { t } = useTranslation()
  const label = 'TODO (V4.1.x): Connection Label' // Bifold:NotificationListItem.tsx:263

  return (
    <NotificationCard
      title={t('Notification.BasicMessage.Title')}
      description={
        label ? t('Notification.BasicMessage.SentMessage', { label }) : t('Notification.BasicMessage.ReceviedMessage')
      }
      buttonTitle={t('Notification.BasicMessage.ButtonTitle')}
      cardType={InfoBoxType.Info}
      onPress={() => {
        // FIXME (V4.1.x): Replace this callback with the appropriate credential notification callback once implemented.
      }}
    />
  )
}

const CredentialOfferNotification = (_props: CredentialNotificationProps) => {
  const { t } = useTranslation()

  return (
    <NotificationCard
      title={t('Notification.CredentialOffer.Title')}
      description={'TODO (V4.1.x): Dynamic content'} // Bifold:NotificationListItem.tsx:270
      buttonTitle={t('Global.View')}
      cardType={InfoBoxType.Info}
      onPress={() => {
        // FIXME (V4.1.x): Replace this callback with the appropriate credential notification callback once implemented.
      }}
    />
  )
}

const ProofRequestNotification = (_props: CredentialNotificationProps) => {
  const { t } = useTranslation()

  return (
    <NotificationCard
      title={t('Notification.ProofRequest.Title')}
      description={'TODO (V4.1.x): Dynamic content'} // Bifold:NotificationListItem.tsx:302
      buttonTitle={t('Global.View')}
      cardType={InfoBoxType.Info}
      onPress={() => {
        // FIXME (V4.1.x): Replace this callback with the appropriate credential notification callback once implemented.
      }}
    />
  )
}

// TODO (V4.1.x): Add Proof notification. Needs more invesitgation. Bifold appears to not have this wired up.
//const ProofNotification = (_props: CredentialNotificationProps) => {}

const RevocationNotification = (_props: CredentialNotificationProps) => {
  const { t } = useTranslation()

  return (
    <NotificationCard
      title={t('Notification.Revocation.Title')}
      description={'TODO (V4.1.x): Dynamic content'} // Bifold:NotificationListItem.tsx:310
      buttonTitle={t('Global.View')}
      cardType={InfoBoxType.Error}
      onPress={() => {
        // FIXME (V4.1.x): Replace this callback with the appropriate credential notification callback once implemented.
      }}
    />
  )
}

export default CredentialNotification
