import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCModals, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

type VerificationSessionExpiredProps = StackScreenProps<BCSCVerifyStackParams, BCSCModals.VerificationSessionExpired>

/**
 * Blocking modal shown when the verification session (device_code) has expired.
 *
 * Reached from the VERIFY-scope system check and the evidence-401 error policy (see issue #4050).
 * Tapping the button performs a full factory reset so the user restarts verification from a clean
 * state; clearing state re-routes RootStack to the OnboardingStack — which does not register this
 * route, so the modal dismisses. If the reset fails, surface the factory-reset alert so the user
 * isn't stranded on a dead screen.
 *
 * @returns {*} {React.ReactElement} The VerificationSessionExpired component.
 */
export const VerificationSessionExpired = ({ navigation }: VerificationSessionExpiredProps): React.ReactElement => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { factoryResetAlert } = useAlerts(navigation)

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    const result = await factoryReset()

    if (!result.success) {
      logger.error('VerificationSessionExpired: Factory reset failed', result.error)
      factoryResetAlert(result.error)
    }
  }, [factoryReset, logger, factoryResetAlert])

  return (
    <SystemModal
      iconName="timer-off"
      headerText={t('BCSC.Modals.VerificationSessionExpired.Header')}
      contentText={[
        t('BCSC.Modals.VerificationSessionExpired.ContentA'),
        t('BCSC.Modals.VerificationSessionExpired.ContentB'),
      ]}
      buttonText={t('BCSC.Modals.VerificationSessionExpired.Button')}
      onButtonPress={handleFactoryReset}
      testID={testIdWithKey('VerificationSessionExpiredButton')}
    />
  )
}
