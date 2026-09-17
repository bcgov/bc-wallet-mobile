import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSecureActions } from './useSecureActions'
import { useVerificationReset } from './useVerificationReset'

/**
 * Returns callbacks for restarting the identity verification process.
 *
 * `restartVerification` resets all verification progress (see {@link useVerificationReset})
 * behind a loading screen, then sets the verification status back to in-progress so the
 * RootStack remounts the VerifyStack at the first verification step. It performs the reset
 * unconditionally — callers that need user confirmation first should use
 * `promptRestartVerification`; a caller that has already decided a restart is unavoidable (e.g. a
 * system check that detected unrecoverable stored data) can call it directly.
 *
 * `promptRestartVerification` asks the user to confirm before calling `restartVerification`.
 *
 * @returns {{ promptRestartVerification: (onConfirm?: () => void) => void, restartVerification: () => Promise<void> }}
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

  return useMemo(
    () => ({ promptRestartVerification, restartVerification }),
    [promptRestartVerification, restartVerification]
  )
}
