import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
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
  const [, dispatch] = useStore<BCState>()

  const restartVerification = useCallback(async () => {
    const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))

    try {
      const success = await verificationReset()

      // On failure the reset already shows a factory reset alert, so only re-enter the verify flow on success
      if (success) {
        // Restarting returns the user to the first step of the verify journey — the setup
        // question ("verify a new account" vs. "connect an existing device"). Clearing the prior
        // choice makes the VerifyStack remount land there (via getResumeStepRoute) instead of
        // resuming the transfer/identity sub-flow the user was previously in.
        dispatch({ type: BCDispatchAction.ACCOUNT_SETUP_TYPE, payload: [] })
        continueVerificationProcess()
      }
    } finally {
      stopLoading()
    }
  }, [loadingScreen, t, verificationReset, continueVerificationProcess, dispatch])

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
