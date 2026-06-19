import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { BCState } from '@/store'
import { useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

interface StartVerificationNotificationProps {
  onClose: () => void
}

/**
 * StartVerificationNotification is a component that displays a notification card prompting the user to start the verification process for their BCSC account.
 *
 * @param props - The properties for the StartVerificationNotification component, including an onClose callback to handle when the notification is dismissed.
 * @returns React.Element - The rendered StartVerificationNotification component.
 */
const StartVerificationNotification = (props: StartVerificationNotificationProps) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  const secureActions = useSecureActions()

  // Later steps gate on step 1 being complete, so id.completed is a faithful proxy for "any step completed".
  const hasCompletedAnyStep = computeSetupStepCompletion(store).id.completed
  const buttonTitle = hasCompletedAnyStep
    ? t('Notification.StartVerification.ContinueButtonTitle')
    : t('Notification.StartVerification.ButtonTitle')

  return (
    <NotificationCard
      title={t('Notification.StartVerification.Title')}
      description={t('Notification.StartVerification.Description')}
      buttonTitle={buttonTitle}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      iconStyle={{ marginRight: 12 }}
      onPress={() => {
        secureActions.continueVerificationProcess()
      }}
      onClose={props.onClose}
      status={NotificationCardStatus.Unread}
    />
  )
}

export default StartVerificationNotification
