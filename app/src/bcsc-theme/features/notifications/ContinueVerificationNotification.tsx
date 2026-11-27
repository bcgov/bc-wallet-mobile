import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

const ContinueVerificationNotification = () => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const secureActions = useSecureActions()

  return (
    <NotificationActionCard
      title={t('Notification.ContinueVerification.Title')}
      description={t('Notification.ContinueVerification.Description')}
      buttonTitle={t('Notification.ContinueVerification.ButtonTitle')}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      hideIconCircle={true}
      requiresServerStatus
      onPress={() => {
        secureActions.continueVerificationProcess()
      }}
    />
  )
}

export default ContinueVerificationNotification
