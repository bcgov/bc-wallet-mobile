import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hook providing the actions a user can take while a verification request is pending:
 * - Check the latest status of the request
 * - Cancel the request and return to verification method selection
 */
export const useVerificationPendingActions = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)

  const handleCheckStatus = useCallback(async () => {
    setIsCheckingStatus(true)
    try {
      if (isUserVerified(store.bcscSecure)) {
        navigation.navigate(BCSCScreens.VerificationSuccess)
        return
      }

      if (!store.bcscSecure.verificationRequestId) {
        throw new Error(t('BCSC.Steps.VerificationIDMissing'))
      }

      const { status, status_message } = await evidence.getVerificationRequestStatus(
        store.bcscSecure.verificationRequestId
      )
      if (status === 'verified') {
        if (!store.bcscSecure.deviceCode || !store.bcscSecure.userCode) {
          throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
        }

        await token.checkDeviceCodeStatus(store.bcscSecure.deviceCode, store.bcscSecure.userCode)
        navigation.navigate(BCSCScreens.VerificationSuccess)
      } else if (status === 'cancelled') {
        navigation.navigate(BCSCScreens.CancelledReview, {
          agentReason: status_message,
        })
      } else {
        navigation.navigate(BCSCScreens.PendingReview)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[useVerificationPendingActions] Failed to check status: ${message}`)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [store.bcscSecure, evidence, navigation, t, token, logger])

  const handleCancelVerification = useCallback(async () => {
    cancelVerificationRequestAlert(async () => {
      try {
        if (!store.bcscSecure.verificationRequestId) {
          return
        }
        await evidence.cancelVerificationRequest(store.bcscSecure.verificationRequestId)
      } catch (error) {
        logger.error(`Error cancelling verification request: ${error}`)
      } finally {
        updateVerificationRequest(null, null)
        dispatch({ type: BCDispatchAction.RESET_SEND_VIDEO })
        dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [undefined] })
        await updateAccountFlags({
          userSubmittedVerificationVideo: false,
        })
        navigation.navigate(BCSCScreens.VerificationMethodSelection)
      }
    })
  }, [
    cancelVerificationRequestAlert,
    store.bcscSecure.verificationRequestId,
    evidence,
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
