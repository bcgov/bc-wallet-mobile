import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { interpretVerificationStatus, UNKNOWN_VERIFICATION_STATUS } from '@/bcsc-theme/utils/verification-status'
import { isVerifiedByTokenExchange } from '@/bcsc-theme/utils/verification-token-exchange'
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
  // Focus, foreground, the review push and the button can all ask for a check at once. One runs at a
  // time; a trigger that arrives mid-flight is coalesced into a single follow-up check, so a decision
  // that lands while a stale "pending" response is still in the air is not dropped
  const checkInFlightRef = useRef(false)
  const queuedCheckRef = useRef<CheckStatusOptions | undefined>(undefined)
  // A response that lands after "Choose another way" belongs to a request that no longer exists; it must
  // not be recorded or navigated on
  const cancelledRequestIdRef = useRef<string | undefined>(undefined)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)
  // Only these fields decide the check, so unrelated secure-state writes don't change its identity (the
  // pending screen re-checks whenever it does)
  const { verificationRequestId, deviceCode, userCode } = store.bcscSecure
  const verified = isUserVerified(store.bcscSecure)

  /** One status check. Never throws: a failure is logged, and shown only when asked. */
  const runStatusCheck = useCallback(
    async ({ surfaceErrors = false }: CheckStatusOptions): Promise<'decided' | 'pending' | 'failed'> => {
      try {
        if (verified) {
          navigation.navigate(BCSCScreens.VerificationSuccess)
          return 'decided'
        }

        if (!verificationRequestId) {
          throw new Error(t('BCSC.Steps.VerificationIDMissing'))
        }

        if (cancelledRequestIdRef.current === verificationRequestId) {
          return 'decided'
        }

        const { status: rawStatus, status_message } =
          await evidenceService.getVerificationRequestStatus(verificationRequestId)
        if (cancelledRequestIdRef.current === verificationRequestId) {
          return 'decided'
        }
        const status = interpretVerificationStatus(rawStatus)
        if (status === VerificationRequestStatus.VERIFIED) {
          if (!deviceCode || !userCode) {
            throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
          }

          await token.checkDeviceCodeStatus(deviceCode, userCode)
          dispatch({
            type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
            payload: [{ status: VerificationRequestStatus.VERIFIED }],
          })
          navigation.navigate(BCSCScreens.VerificationSuccess)
          return 'decided'
        }

        if (status === VerificationRequestStatus.CANCELLED) {
          dispatch({
            type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
            payload: [{ status: VerificationRequestStatus.CANCELLED, status_message }],
          })
          navigation.navigate(BCSCScreens.CancelledReview, {
            agentReason: status_message,
          })
          return 'decided'
        }

        if (status === UNKNOWN_VERIFICATION_STATUS) {
          logger.warn(
            `[useVerificationPendingActions] Unrecognised verification status '${rawStatus}'; asking the token endpoint`
          )
          if (!deviceCode || !userCode) {
            throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
          }

          const exchanged = await isVerifiedByTokenExchange(() => token.checkDeviceCodeStatus(deviceCode, userCode))
          if (cancelledRequestIdRef.current === verificationRequestId) {
            return 'decided'
          }
          if (exchanged) {
            dispatch({
              type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
              payload: [{ status: VerificationRequestStatus.VERIFIED }],
            })
            navigation.navigate(BCSCScreens.VerificationSuccess)
            return 'decided'
          }
        }

        if (status !== UNKNOWN_VERIFICATION_STATUS) {
          dispatch({
            type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
            payload: [{ status: VerificationRequestStatus.PENDING }],
          })
        }
        navigation.navigate(BCSCScreens.PendingReview)
        return 'pending'
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
        return 'failed'
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
      dispatch,
    ]
  )

  const handleCheckStatus = useCallback(
    async ({ surfaceErrors = false }: CheckStatusOptions = {}) => {
      if (checkInFlightRef.current) {
        // Remember that a fresh check is wanted; a manual press among the triggers keeps its right to be told
        queuedCheckRef.current = { surfaceErrors: surfaceErrors || Boolean(queuedCheckRef.current?.surfaceErrors) }
        return
      }
      checkInFlightRef.current = true
      setIsCheckingStatus(true)
      try {
        const outcome = await runStatusCheck({ surfaceErrors })
        const queued = queuedCheckRef.current
        queuedCheckRef.current = undefined
        // Nothing left to re-fetch (decided or cancelled): the check has navigated on or the request is gone
        if (queued && outcome !== 'decided') {
          await runStatusCheck(queued)
        }
      } finally {
        queuedCheckRef.current = undefined
        checkInFlightRef.current = false
        setIsCheckingStatus(false)
      }
    },
    [runStatusCheck]
  )

  const handleCancelVerification = useCallback(async () => {
    cancelVerificationRequestAlert(async () => {
      try {
        if (!verificationRequestId) {
          return
        }
        cancelledRequestIdRef.current = verificationRequestId
        await evidenceService.cancelVerificationRequest(verificationRequestId)
      } catch (error) {
        logger.error(`Error cancelling verification request: ${error}`)
      } finally {
        await updateVerificationRequest(undefined, null)
        dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
        dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
        // The request no longer exists, so a recorded pending status must not outlive it on Home
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
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
