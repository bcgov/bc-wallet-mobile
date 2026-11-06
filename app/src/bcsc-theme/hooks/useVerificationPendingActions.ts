import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { VerificationRequestStatus } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvidenceService } from '../services/hooks/useEvidenceService'

/**
 * Hook providing what the pending review does while a verification request waits on its agent review:
 * - Check the latest status of the request. Every check is automatic (focus, foreground, the review
 *   push) — the screen offers no manual one — so a failure is logged and left to the next trigger.
 * - Cancel the request and return to verification method selection
 */
export const useVerificationPendingActions = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { token } = useApi()
  const evidenceService = useEvidenceService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  // Focus, foreground and the review push can all ask for a check at once. One runs at a time; a
  // trigger that arrives mid-flight is coalesced into a single follow-up check, so a decision that
  // lands while a stale "pending" response is still in the air is not dropped
  const checkInFlightRef = useRef(false)
  const queuedCheckRef = useRef(false)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)
  // Only these fields decide the check, so unrelated secure-state writes don't change its identity (the
  // pending screen re-checks whenever it does)
  const { verificationRequestId, deviceCode, userCode } = store.bcscSecure
  const verified = isUserVerified(store.bcscSecure)

  /** One status check. Never throws: a failure is logged and left to the next trigger. */
  const runStatusCheck = useCallback(async (): Promise<'decided' | 'pending' | 'failed'> => {
    try {
      if (verified) {
        navigation.navigate(BCSCScreens.VerificationSuccess)
        return 'decided'
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
        return 'decided'
      }

      if (status === VerificationRequestStatus.CANCELLED) {
        navigation.navigate(BCSCScreens.CancelledReview, {
          agentReason: status_message,
        })
        return 'decided'
      }

      navigation.navigate(BCSCScreens.PendingReview)
      return 'pending'
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationPendingActions] Failed to check status: ${message}`)
      return 'failed'
    }
  }, [verified, verificationRequestId, deviceCode, userCode, evidenceService, navigation, t, token, logger])

  const handleCheckStatus = useCallback(async () => {
    if (checkInFlightRef.current) {
      queuedCheckRef.current = true
      return
    }
    checkInFlightRef.current = true
    try {
      const outcome = await runStatusCheck()
      const queued = queuedCheckRef.current
      queuedCheckRef.current = false
      // A decided check has already navigated on; a queued trigger could only re-fetch the same decision
      if (queued && outcome !== 'decided') {
        await runStatusCheck()
      }
    } finally {
      queuedCheckRef.current = false
      checkInFlightRef.current = false
    }
  }, [runStatusCheck])

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
    handleCheckStatus,
    handleCancelVerification,
  }
}

export default useVerificationPendingActions
