import { useRestartVerificationAction } from '@/bcsc-theme/hooks/useRestartVerification'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationState } from '@/bcsc-theme/state/verification/useVerificationState'
import { useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationActionCard from './NotificationActionCard'

/**
 * StartVerificationNotification is a component that displays a notification card prompting the user to start the verification process for their BCSC account.
 *
 * @returns React.Element - The rendered StartVerificationNotification component.
 */
const StartVerificationNotification = () => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const secureActions = useSecureActions()
  const { needsFreshStart } = useVerificationState()
  const restartVerification = useRestartVerificationAction()

  return (
    <NotificationActionCard
      title={t('Notification.StartVerification.Title')}
      description={t('Notification.StartVerification.Description')}
      buttonTitle={t('Notification.StartVerification.ButtonTitle')}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      hideIconCircle={true}
      requiresServerStatus
      onPress={() => {
        // A registration cancelled or expired before setup finished starts over, as a renewal does
        if (needsFreshStart) {
          void restartVerification()
          return
        }

        // Marks verification started, so a relaunch resumes it. The user's answer to the onboarding
        // prompt (verificationSkipped) is left as it was: starting from Home is not answering it
        secureActions.continueVerificationProcess()
      }}
    />
  )
}

export default StartVerificationNotification
