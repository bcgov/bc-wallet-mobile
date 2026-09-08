import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { useStore, useTheme } from '@bifold/core'
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
  const [, dispatch] = useStore<BCState>()

  return (
    <NotificationActionCard
      title={t('Notification.StartVerification.Title')}
      description={t('Notification.StartVerification.Description')}
      buttonTitle={t('Notification.StartVerification.ButtonTitle')}
      icon="information"
      iconColor={ColorPalette.brand.primary}
      hideIconCircle={true}
      onPress={() => {
        dispatch({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED, payload: [false] })
        secureActions.continueVerificationProcess()
      }}
    />
  )
}

export default StartVerificationNotification
