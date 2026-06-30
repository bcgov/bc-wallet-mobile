import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

const PendingReviewNotification = () => {
  const { t } = useTranslation()
  const secureActions = useSecureActions()

  return (
    <NotificationCard
      title={t('Notification.PendingReview.Title')}
      description={t('Notification.PendingReview.Description')}
      buttonTitle={'Check status'}
      icon="alert-circle"
      onPress={() => secureActions.continueVerificationProcess()}
      status={NotificationCardStatus.Unread}
    />
  )
}

export default PendingReviewNotification
