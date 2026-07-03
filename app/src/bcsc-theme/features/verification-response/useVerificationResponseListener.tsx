import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  useVerificationResponseService,
  VerificationResponseNavigationEvent,
} from '@/bcsc-theme/features/verification-response'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useEffect } from 'react'

type VerificationResponseCallback = {
  onSuccess: () => void
  onCancelled: (agentReason?: string) => void
}

/**
 * Hook that listens for verification response push notifications and navigates accordingly.
 *
 * This hook should be used in the VerifyStack navigator to handle the case where a user
 * receives a push notification indicating their verification has been reviewed.
 *
 * Handles verification response events:
 *
 * Request reviewed (send-video): The notification indicates the video was reviewed.
 *    - First checks verification status via API
 *    - If status is 'verified', fetches tokens via checkDeviceCodeStatus, then navigates to success
 *    - If status is 'cancelled', navigates to CancelledReview with the agent reason
 *    - If status is 'pending', does not navigate (user should check manually)
 *
 * Token fetching happens in this hook before navigation. VerificationSuccessScreen handles
 * final account setup (marking verified, metadata cleanup, registration update).
 * This follows the same pattern as the "Check Status" button on PendingReviewScreen.
 */
export const useVerificationResponseListener = ({ onSuccess, onCancelled }: VerificationResponseCallback) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const verificationResponseService = useVerificationResponseService()

  /**
   * Handle request reviewed (send-video verification or live call).
   * The notification indicates the video was reviewed, but we need to check the actual status.
   * This mirrors the "Check Status" button behavior on PendingReviewScreen.
   */
  const handleRequestReviewed = useCallback(async () => {
    logger.info('[useVerificationResponseListener] Request reviewed event received (send-video/live call)')

    try {
      const { verificationRequestId, deviceCode, userCode } = store.bcscSecure

      // Validate we have the device codes needed for token fetch
      if (!deviceCode || !userCode || !verificationRequestId) {
        logger.error(
          `[useVerificationResponseListener] Missing deviceCode ${deviceCode} or userCode ${userCode} or verificationRequestId ${verificationRequestId}`
        )
        return
      }

      // Check the verification request status (same as Check Status button)
      logger.info('[useVerificationResponseListener] Checking verification request status')
      const { status, status_message } = await evidence.getVerificationRequestStatus(verificationRequestId)
      logger.info(`[useVerificationResponseListener] Verification request status: ${status}`)

      if (status === 'verified') {
        // Status is verified - fetch and update tokens
        await token.checkDeviceCodeStatus(deviceCode, userCode)
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: ['verified'] })
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
        return
      }

      if (status === 'cancelled') {
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: ['cancelled'] })
        dispatch({
          type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
          payload: [status_message],
        })
        logger.info('[useVerificationResponseListener] Verification request cancelled, navigating to CancelledReview')
        // onCancelled(status_message)
        return
      }

      if (status === 'pending') {
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: ['pending'] })
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
        // Status is pending - user should check manually via the UI
        logger.info(`[useVerificationResponseListener] Verification status is '${status}', not navigating`)
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationResponseListener] Failed to handle request reviewed: ${message}`)
    }
  }, [logger, store.bcscSecure, evidence, token, dispatch])

  /**
   * Route the event to the appropriate handler based on event type.
   */
  const handleNavigationEvent = useCallback(
    async (event: VerificationResponseNavigationEvent) => {
      if (event.eventType === 'request_reviewed') {
        await handleRequestReviewed()
      } else {
        logger.warn(`[useVerificationResponseListener] Unknown event type: ${event.eventType}`)
      }
    },
    [handleRequestReviewed, logger]
  )

  useEffect(() => {
    // Subscribe to navigation events from the service
    const unsubscribe = verificationResponseService.onNavigationRequest(handleNavigationEvent)

    // Process any pending approval that was buffered before this hook mounted
    // (e.g., cold-start from push notification)
    if (verificationResponseService.hasPendingApproval) {
      logger.info('[useVerificationResponseListener] Processing pending approval from cold-start')
      verificationResponseService.processPendingApproval()
    }

    return unsubscribe
  }, [verificationResponseService, handleNavigationEvent, logger])
}
