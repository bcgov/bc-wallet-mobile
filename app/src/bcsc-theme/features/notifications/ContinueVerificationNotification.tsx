import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

/**
 * ContinueVerificationNotification is a component that displays a notification card prompting the user to continue the verification process for their BCSC account.
 *
 * @returns React.Element - The rendered ContinueVerificationNotification component.
 */
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
      onPress={() => {
        secureActions.continueVerificationProcess()
      }}
    />
  )
}

export default ContinueVerificationNotification
