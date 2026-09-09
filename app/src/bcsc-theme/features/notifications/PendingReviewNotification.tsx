import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'
import { useGuardedVerificationEntry } from './useGuardedVerificationEntry'

const PendingReviewNotification = () => {
  const { ColorPalette } = useTheme()
  const { t } = useTranslation()
  const secureActions = useSecureActions()
  const guardVerificationEntry = useGuardedVerificationEntry()

  return (
    <NotificationActionCard
      title={t('Notification.PendingReview.Title')}
      description={t('Notification.PendingReview.Description')}
      buttonTitle={t('Notification.PendingReview.ButtonTitle')}
      icon="information"
      hideIconCircle={true}
      iconColor={ColorPalette.brand.primary}
      onPress={guardVerificationEntry(() => secureActions.continueVerificationProcess())}
    />
  )
}

export default PendingReviewNotification
