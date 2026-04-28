import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { InfoBoxType } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import NotificationCard from './NotificationCard'

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
  const secureActions = useSecureActions()

  return (
    <NotificationCard
      title={t('Notification.StartVerification.Title')}
      description={t('Notification.StartVerification.Description')}
      buttonTitle={t('Notification.StartVerification.ButtonTitle')}
      onPress={() => {
        secureActions.continueVerificationProcess()
      }}
      onClose={props.onClose}
      cardType={InfoBoxType.Info}
    />
  )
}

export default StartVerificationNotification
