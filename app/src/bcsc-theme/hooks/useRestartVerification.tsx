import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSecureActions } from './useSecureActions'
import { useVerificationReset } from './useVerificationReset'

/**
 * Returns a callback that asks the user to confirm restarting the identity verification process.
 *
 * On confirmation, all verification progress is reset (see {@link useVerificationReset}) behind
 * a loading screen, then the verification status is set back to in-progress so the RootStack
 * remounts the VerifyStack at the first verification step.
 *
 * @returns {(onConfirm?: () => void) => void} Callback that shows the confirmation alert. The
 * optional `onConfirm` is invoked when the user confirms, before the reset starts (e.g. to
 * close the menu the restart was triggered from).
 */
export const useRestartVerification = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const loadingScreen = useLoadingScreen()
  const verificationReset = useVerificationReset()
  const { continueVerificationProcess } = useSecureActions()

  const restartVerification = useCallback(async () => {
    const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))

    try {
      const success = await verificationReset()

      // On failure the reset already shows a factory reset alert, so only re-enter the verify flow on success
      if (success) {
        continueVerificationProcess()
      }
    } finally {
      stopLoading()
    }
  }, [loadingScreen, t, verificationReset, continueVerificationProcess])

  const promptRestartVerification = useCallback(
    (onConfirm?: () => void) => {
      emitAlert(t('Alerts.RestartVerification.Title'), t('Alerts.RestartVerification.Description'), {
        event: AppEventCode.RESTART_VERIFICATION,
        actions: [
          {
            text: t('Global.Cancel'),
            style: 'cancel',
          },
          {
            text: t('Alerts.RestartVerification.Action1'),
            style: 'destructive',
            onPress: async () => {
              onConfirm?.()
              await restartVerification()
            },
          },
        ],
      })
    },
    [emitAlert, t, restartVerification]
  )

  return promptRestartVerification
}
