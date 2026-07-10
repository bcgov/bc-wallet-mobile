import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

const PendingReviewNotification = () => {
  const { ColorPalette } = useTheme()
  const { t } = useTranslation()
  const secureActions = useSecureActions()

  return (
    <NotificationActionCard
      title={t('Notification.PendingReview.Title')}
      description={t('Notification.PendingReview.Description')}
      buttonTitle={t('Notification.PendingReview.ButtonTitle')}
      icon="information"
      hideIconCircle={true}
      iconColor={ColorPalette.brand.primary}
      onPress={() => secureActions.continueVerificationProcess()}
    />
  )
}

export default PendingReviewNotification
