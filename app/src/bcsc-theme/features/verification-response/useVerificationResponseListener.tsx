import useApi from '@/bcsc-theme/api/hooks/useApi'
import {
  useVerificationResponseService,
  VerificationResponseNavigationEvent,
} from '@/bcsc-theme/features/verification-response'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useCallback, useEffect } from 'react'
import { BCSCScreens } from '../../types/navigators'

/**
 * Hook that listens for verification response push notifications and navigates to the success screen.
 *
 * This hook should be used in the VerifyStack navigator to handle the case where a user
 * receives a push notification indicating their verification has been approved.
 *
 * Handles two types of verification events:
 *
 * 1. Direct approval (in-person): The notification contains explicit approval claims.
 *    - Navigates directly to success screen (notification confirms approval)
 *
 * 2. Request reviewed (send-video): The notification indicates the video was reviewed.
 *    - First checks verification status via API
 *    - If status is 'verified', navigates to success screen
 *    - If not verified, does not navigate (user should check manually)
 *
 * The VerificationSuccessScreen handles all cleanup (token fetching, marking verified, etc.)
 * This follows the same pattern as the "Check Status" button in SetupStepsScreen.
 */
export const useVerificationResponseListener = () => {
  const navigation = useNavigation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { evidence, token } = useApi()
  const verificationResponseService = useVerificationResponseService()

  /**
   * Navigate to the success screen using a reset to prevent back navigation.
   */
  const navigateToSuccess = useCallback(() => {
    logger.info('[useVerificationResponseListener] Navigating to success screen')
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCScreens.VerificationSuccess }],
      })
    )
  }, [logger, navigation])

  /**
   * Handle direct approval (in-person verification).
   * The notification contains explicit approval, so we navigate directly to success.
   * The VerificationSuccessScreen will handle token fetching and cleanup.
   */
  const handleDirectApproval = useCallback(async () => {
    logger.info('[useVerificationResponseListener] Direct approval event received (in-person)')

    try {
      const { deviceCode, userCode } = store.bcscSecure

      if (!deviceCode || !userCode) {
        logger.error('[useVerificationResponseListener] Missing deviceCode or userCode')
        return
      }

      // fetch and update tokens
      await token.checkDeviceCodeStatus(deviceCode, userCode)
      navigateToSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationResponseListener] Failed to handle direct approval: ${message}`)
    }
  }, [logger, store.bcscSecure, navigateToSuccess, token])

  /**
   * Handle request reviewed (send-video verification or live call).
   * The notification indicates the video was reviewed, but we need to check the actual status.
   * This mirrors the "Check Status" button behavior in SetupStepsScreen.
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
      const { status } = await evidence.getVerificationRequestStatus(verificationRequestId)
      logger.info(`[useVerificationResponseListener] Verification request status: ${status}`)

      if (status === 'verified') {
        // Status is verified - fetch and update tokens
        await token.checkDeviceCodeStatus(deviceCode, userCode)
        // Navigate to success screen - it will handle token fetching and cleanup
        navigateToSuccess()
        return
      }

      if (status === 'cancelled') {
        // TODO: (ke) handle verification request cancelled
        logger.info(`[useVerificationResponseListener] Verification request cancelled, not navigating`)
        return
      }

      if (status === 'pending') {
        // Status is pending - user should check manually via the UI
        logger.info(`[useVerificationResponseListener] Verification status is '${status}', not navigating`)
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationResponseListener] Failed to handle request reviewed: ${message}`)
    }
  }, [logger, store.bcscSecure, evidence, navigateToSuccess, token])

  /**
   * Route the event to the appropriate handler based on event type.
   */
  const handleNavigationEvent = useCallback(
    async (event: VerificationResponseNavigationEvent) => {
      switch (event.eventType) {
        case 'direct_approval':
          await handleDirectApproval()
          break
        case 'request_reviewed':
          await handleRequestReviewed()
          break
        default:
          logger.warn(`[useVerificationResponseListener] Unknown event type: ${event.eventType}`)
      }
    },
    [handleDirectApproval, handleRequestReviewed, logger]
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
