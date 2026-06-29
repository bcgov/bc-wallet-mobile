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
      icon="clock-outline"
      status={NotificationCardStatus.Attention}
      onPress={() => secureActions.continueVerificationProcess()}
    />
  )
}

export default PendingReviewNotification
