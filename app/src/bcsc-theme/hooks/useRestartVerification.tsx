import BCSCApiClient from '@/bcsc-theme/api/client'
import useEvidenceApi from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { isAxiosAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSecureActions } from './useSecureActions'
import { useVerificationReset } from './useVerificationReset'
import { discardInFlightVerificationRequests } from './useVideoPrompts'

/**
 * Returns a callback that restarts the identity verification process at once, with no confirmation.
 *
 * Any pending verification request is first cancelled with IAS (best effort: a
 * failed cancel is logged and the restart carries on), then all verification progress is reset
 * (see {@link useVerificationReset}) behind a loading screen, then the user re-enters the verify
 * flow so the RootStack remounts the VerifyStack at the first verification step.
 *
 * @returns {() => Promise<void>} Callback that runs the restart. It does not throw: a failed reset
 * already shows the factory reset alert, and a failed cancel is logged.
 */
export const useRestartVerificationAction = () => {
  const { t } = useTranslation()
  const loadingScreen = useLoadingScreen()
  const verificationReset = useVerificationReset()
  const { continueVerificationProcess } = useSecureActions()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client } = useBCSCApiClientState()
  const evidenceApi = useEvidenceApi(client as BCSCApiClient)
  const verificationRequestId = store.bcscSecure.verificationRequestId

  const cancelPendingVerificationRequest = useCallback(async (): Promise<void> => {
    if (!verificationRequestId) {
      return
    }

    try {
      await evidenceApi.cancelVerificationRequest(verificationRequestId)
    } catch (error) {
      if (isAxiosAppError(error, 404)) {
        logger.info('[useRestartVerification] Verification request already cancelled or decided')
        return
      }

      logger.warn('[useRestartVerification] Failed to cancel the pending verification request; restarting anyway', {
        error,
      })
    }
  }, [verificationRequestId, evidenceApi, logger])

  const restartVerification = useCallback(async () => {
    const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))

    try {
      // Before the awaited cancel, which leaves the stored id alone for itself
      discardInFlightVerificationRequests()

      // Must run first: the reset clears the request id and device code the cancel needs
      await cancelPendingVerificationRequest()

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
  }, [loadingScreen, t, cancelPendingVerificationRequest, verificationReset, continueVerificationProcess, dispatch])

  return restartVerification
}

/**
 * Returns a callback that asks the user to confirm restarting the identity verification process, and
 * on confirmation runs {@link useRestartVerificationAction}.
 *
 * @returns {(onConfirm?: () => void) => void} Callback that shows the confirmation alert. The
 * optional `onConfirm` is invoked when the user confirms, before the reset starts (e.g. to
 * close the menu the restart was triggered from).
 */
export const useRestartVerification = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const restartVerification = useRestartVerificationAction()

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
