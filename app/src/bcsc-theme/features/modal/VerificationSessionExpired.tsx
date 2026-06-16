import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Blocking modal shown when the verification session (device_code) has expired.
 *
 * Reached from three triggers (startup system check, evidence 401 error policy, and the
 * residential-address self-heal) — see issue #4050. Tapping the button performs a full
 * factory reset so the user restarts verification from a clean state. Clearing state flips
 * hasAccount/didAuthenticate, which causes RootStack to re-route to the OnboardingStack —
 * no manual navigation is required here.
 *
 * @returns {*} {React.ReactElement} The VerificationSessionExpired component.
 */
export const VerificationSessionExpired = (): React.ReactElement => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    const result = await factoryReset()

    if (!result.success) {
      logger.error('VerificationSessionExpired: Factory reset failed', result.error)
    }
  }, [factoryReset, logger])

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
