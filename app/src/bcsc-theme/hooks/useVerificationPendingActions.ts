import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { VerificationRequestStatus } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvidenceService } from '../services/hooks/useEvidenceService'

export type CheckStatusOptions = {
  /**
   * Show a failed check to the user. On for the "Check status" button, where silence would read as
   * "still pending"; off for the automatic checks (focus, foreground, push), which only log it.
   */
  surfaceErrors?: boolean
}

/**
 * Hook providing the actions a user can take while a verification request is pending:
 * - Check the latest status of the request
 * - Cancel the request and return to verification method selection
 */
export const useVerificationPendingActions = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { token } = useApi()
  const evidenceService = useEvidenceService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorModal } = useErrorAlert()
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  // Focus, foreground, the review push and the button can all ask for a check at once; one at a time
  // is enough, the next trigger fetches the latest status anyway
  const checkInFlightRef = useRef(false)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)
  // Only these fields decide the check, so unrelated secure-state writes don't change its identity (the
  // pending screen re-checks whenever it does)
  const { verificationRequestId, deviceCode, userCode } = store.bcscSecure
  const verified = isUserVerified(store.bcscSecure)

  const handleCheckStatus = useCallback(
    async ({ surfaceErrors = false }: CheckStatusOptions = {}) => {
      if (checkInFlightRef.current) {
        return
      }
      checkInFlightRef.current = true
      setIsCheckingStatus(true)
      try {
        if (verified) {
          navigation.navigate(BCSCScreens.VerificationSuccess)
          return
        }

        if (!verificationRequestId) {
          throw new Error(t('BCSC.Steps.VerificationIDMissing'))
        }

        const { status, status_message } = await evidenceService.getVerificationRequestStatus(verificationRequestId)
        if (status === VerificationRequestStatus.VERIFIED) {
          if (!deviceCode || !userCode) {
            throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
          }

          await token.checkDeviceCodeStatus(deviceCode, userCode)
          navigation.navigate(BCSCScreens.VerificationSuccess)
        } else if (status === VerificationRequestStatus.CANCELLED) {
          navigation.navigate(BCSCScreens.CancelledReview, {
            agentReason: status_message,
          })
        } else {
          navigation.navigate(BCSCScreens.PendingReview)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`[useVerificationPendingActions] Failed to check status: ${message}`)
        if (surfaceErrors) {
          emitErrorModal(
            t('Error.Problem'),
            t('Error.ProblemDescription'),
            ensureAppError(error, AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION)
          )
        }
      } finally {
        checkInFlightRef.current = false
        setIsCheckingStatus(false)
      }
    },
    [
      verified,
      verificationRequestId,
      deviceCode,
      userCode,
      evidenceService,
      navigation,
      t,
      token,
      logger,
      emitErrorModal,
    ]
  )

  const handleCancelVerification = useCallback(async () => {
    cancelVerificationRequestAlert(async () => {
      try {
        if (!verificationRequestId) {
          return
        }
        await evidenceService.cancelVerificationRequest(verificationRequestId)
      } catch (error) {
        logger.error(`Error cancelling verification request: ${error}`)
      } finally {
        await updateVerificationRequest(undefined, null)
        dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
        dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
        await updateAccountFlags({
          userSubmittedVerificationVideo: false,
        }).catch((error) => {
          logger.error(`Error resetting account flags after cancelling verification: ${error}`)
        })
        // reset navigation stack
        navigation.reset({
          index: 0,
          routes: [{ name: BCSCScreens.VerificationMethodSelection }],
        })
      }
    })
  }, [
    cancelVerificationRequestAlert,
    verificationRequestId,
    evidenceService,
    logger,
    updateVerificationRequest,
    dispatch,
    updateAccountFlags,
    navigation,
  ])

  return {
    isCheckingStatus,
    handleCheckStatus,
    handleCancelVerification,
  }
}

export default useVerificationPendingActions
