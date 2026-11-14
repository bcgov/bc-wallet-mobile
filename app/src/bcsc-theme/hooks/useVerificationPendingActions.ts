import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { selectVerificationState } from '@/bcsc-theme/state/verification/selectors'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { interpretVerificationStatus, UNKNOWN_VERIFICATION_STATUS } from '@/bcsc-theme/utils/verification-status'
import { isVerifiedByTokenExchange } from '@/bcsc-theme/utils/verification-token-exchange'
import { VerificationRequestStatus } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { AbstractBifoldLogger, TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { TFunction } from 'i18next'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvidenceService } from '../services/hooks/useEvidenceService'

type StatusDecision =
  | { status: VerificationRequestStatus.VERIFIED | VerificationRequestStatus.PENDING }
  | { status: VerificationRequestStatus.CANCELLED; status_message?: string }
  // Pending, but not recorded: an unrecognised status is never stored
  | { status: typeof UNKNOWN_VERIFICATION_STATUS }

type StatusFetchContext = {
  requestId?: string
  deviceCode?: string
  userCode?: string
  evidenceService: ReturnType<typeof useEvidenceService>
  token: ReturnType<typeof useApi>['token']
  logger: AbstractBifoldLogger
  t: TFunction
  // True once "Choose another way" has cancelled this request; its responses are then ignored
  isCancelled: () => boolean
}

const isCancelledRequest = (cancelledRequestId?: string, requestId?: string) =>
  Boolean(cancelledRequestId) && (!requestId || cancelledRequestId === requestId)

const requireCodes = ({ deviceCode, userCode, t }: StatusFetchContext) => {
  if (!deviceCode || !userCode) {
    throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
  }
  return [deviceCode, userCode] as const
}

const resolveUnknownStatus = async (
  ctx: StatusFetchContext,
  rawStatus: unknown
): Promise<StatusDecision | 'abandoned'> => {
  ctx.logger.warn(
    `[useVerificationPendingActions] Unrecognised verification status '${rawStatus}'; asking the token endpoint`
  )
  const [deviceCode, userCode] = requireCodes(ctx)
  const exchanged = await isVerifiedByTokenExchange(() => ctx.token.checkDeviceCodeStatus(deviceCode, userCode))
  if (ctx.isCancelled()) {
    return 'abandoned'
  }
  return { status: exchanged ? VerificationRequestStatus.VERIFIED : UNKNOWN_VERIFICATION_STATUS }
}

const fetchStatusDecision = async (ctx: StatusFetchContext): Promise<StatusDecision | 'abandoned'> => {
  if (!ctx.requestId) {
    throw new Error(ctx.t('BCSC.Steps.VerificationIDMissing'))
  }
  const { status: rawStatus, status_message } = await ctx.evidenceService.getVerificationRequestStatus(ctx.requestId)
  if (ctx.isCancelled()) {
    return 'abandoned'
  }
  const status = interpretVerificationStatus(rawStatus)
  switch (status) {
    case VerificationRequestStatus.VERIFIED:
      await ctx.token.checkDeviceCodeStatus(...requireCodes(ctx))
      return { status }
    case VerificationRequestStatus.CANCELLED:
      return { status, status_message }
    case UNKNOWN_VERIFICATION_STATUS:
      return resolveUnknownStatus(ctx, rawStatus)
    default:
      return { status: VerificationRequestStatus.PENDING }
  }
}

type StoreDispatch = ReturnType<typeof useStore<BCState>>[1]

const recordAndNavigate = (
  dispatch: StoreDispatch,
  navigation: StackNavigationProp<BCSCVerifyStackParams>,
  decision: StatusDecision
): 'decided' | 'pending' => {
  if (decision.status !== UNKNOWN_VERIFICATION_STATUS) {
    dispatch({ type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED, payload: [decision] })
  }
  switch (decision.status) {
    case VerificationRequestStatus.VERIFIED:
      navigation.navigate(BCSCScreens.VerificationSuccess)
      return 'decided'
    case VerificationRequestStatus.CANCELLED:
      navigation.navigate(BCSCScreens.CancelledReview, { agentReason: decision.status_message })
      return 'decided'
    default:
      navigation.navigate(BCSCScreens.PendingReview)
      return 'pending'
  }
}

const clearSubmittedRequest = (dispatch: StoreDispatch) => {
  dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
  dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
  dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
  // The request no longer exists, so a recorded pending status must not outlive it on Home
  dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
  dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
}

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
  // A response that lands after "Choose another way" belongs to a request that no longer exists; it must
  // not be recorded or navigated on
  const cancelledRequestIdRef = useRef<string | undefined>(undefined)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)
  // Only these fields decide the check, so unrelated secure-state writes don't change its identity (the
  // pending screen re-checks whenever it does)
  const { verificationRequestId, deviceCode, userCode } = store.bcscSecure
  const verified = selectVerificationState(store).isDeviceVerifiedByIas

  /** One status check. Never throws: a failure is logged and left to the next trigger. */
  const runStatusCheck = useCallback(async (): Promise<'decided' | 'pending' | 'failed'> => {
    try {
      if (verified) {
        navigation.navigate(BCSCScreens.VerificationSuccess)
        return 'decided'
      }

      // Choosing another way clears the request id before the screen leaves, which re-runs the focus check;
      // that is not a missing id worth logging
      if (isCancelledRequest(cancelledRequestIdRef.current, verificationRequestId)) {
        return 'decided'
      }

      const decision = await fetchStatusDecision({
        requestId: verificationRequestId,
        deviceCode,
        userCode,
        evidenceService,
        token,
        logger,
        t,
        isCancelled: () => cancelledRequestIdRef.current === verificationRequestId,
      })
      if (decision === 'abandoned') {
        return 'decided'
      }
      return recordAndNavigate(dispatch, navigation, decision)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationPendingActions] Failed to check status: ${message}`)
      return 'failed'
    }
  }, [verified, verificationRequestId, deviceCode, userCode, evidenceService, navigation, t, token, logger, dispatch])

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
      // Nothing left to re-fetch (decided or cancelled): the check has navigated on or the request is gone
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
        cancelledRequestIdRef.current = verificationRequestId
        await evidenceService.cancelVerificationRequest(verificationRequestId)
      } catch (error) {
        logger.error(`Error cancelling verification request: ${error}`)
      } finally {
        await updateVerificationRequest(undefined, null)
        clearSubmittedRequest(dispatch)
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
