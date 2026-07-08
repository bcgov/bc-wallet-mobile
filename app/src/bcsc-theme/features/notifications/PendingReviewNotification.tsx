import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

const PendingReviewNotification = () => {
  const { t } = useTranslation()
  const secureActions = useSecureActions()

  return (
    <NotificationActionCard
      title={t('Notification.PendingReview.Title')}
      description={t('Notification.PendingReview.Description')}
      buttonTitle={t('Notification.PendingReview.ButtonTitle')}
      icon="alert-circle"
      onPress={() => secureActions.continueVerificationProcess()}
    />
  )
}

export default PendingReviewNotification
