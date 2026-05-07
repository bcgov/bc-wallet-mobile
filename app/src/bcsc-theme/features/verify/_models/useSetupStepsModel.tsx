import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { useAlerts } from '@/hooks/useAlerts'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCCardProcess } from 'react-native-bcsc-core'

/**
 * Model hook for the SetupStepsScreen that provides:
 * - Step state (completed, focused, subtext) from useSetupSteps
 * - Navigation actions for each step
 * - Handlers for checking status and cancelling verification
 */
const useSetupStepsModel = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)

  // Get unified step state (completed, focused, subtext for each step)
  const steps = useSetupSteps(store)

  /**
   * Check the status of a pending verification request
   */
  const handleCheckStatus = useCallback(async () => {
    setIsCheckingStatus(true)
    try {
      if (isUserVerified(store.bcscSecure)) {
        // If we have a refresh token we can assume verification is complete
        // Scenario: user checked their status but closed the app before completing VerificationSuccess
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

        if (store.bcscSecure.deviceCode && store.bcscSecure.userCode) {
          // checkDeviceCodeStatus already calls updateTokens internally, no need to call it again
          await token.checkDeviceCodeStatus(store.bcscSecure.deviceCode, store.bcscSecure.userCode)
        }

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
      logger.error(`[useSetupStepsModel] Failed to check status: ${message}`)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [store.bcscSecure, evidence, navigation, t, token, logger])

  /**
   * Cancel a pending verification request
   */
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
        // Clear verification request from secure state
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

  /**
   * Navigation actions for each step
   */
  const stepActions = useMemo(
    () => ({
      id: () => {
        if (steps.id.nonBcscNeedsAdditionalCard) {
          const hasPhotoEvidence = store.bcscSecure.additionalEvidenceData.some(
            (evidence) => evidence.evidenceType?.has_photo
          )
          navigation.navigate(BCSCScreens.EvidenceTypeList, {
            cardProcess: BCSCCardProcess.NonBCSC,
            // Note: User must choose a photo ID if the first Non-BCSC ID they provided had no photo
            photoFilter: !hasPhotoEvidence ? 'photo' : undefined,
          })
          return
        }
        if (steps.id.nonPhotoBcscNeedsAdditionalCard) {
          navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
          return
        }
        if (!steps.id.completed) {
          navigation.navigate(BCSCScreens.IdentitySelection)
        }
      },

      address: () => {
        navigation.navigate(BCSCScreens.ResidentialAddress)
      },

      email: () => {
        navigation.navigate(BCSCScreens.EnterEmail, { cardProcess: store.bcscSecure.cardProcess! })
      },

      verify: () => {
        // Note: This ensures that if the user somehow got to the steps screen with a refresh token (shouldn't be possible but just in case), we navigate them to the success screen
        if (isUserVerified(store.bcscSecure)) {
          navigation.navigate(BCSCScreens.VerificationSuccess)
          return
        }

        navigation.navigate(BCSCScreens.VerificationMethodSelection)
      },
      transfer: () => {
        navigation.navigate(BCSCScreens.TransferAccountInstructions)
      },
    }),
    [
      navigation,
      steps.id.nonBcscNeedsAdditionalCard,
      steps.id.nonPhotoBcscNeedsAdditionalCard,
      steps.id.completed,
      store.bcscSecure,
    ]
  )

  return {
    steps,
    stepActions,
    isCheckingStatus,
    handleCheckStatus,
    handleCancelVerification,
  }
}

export default useSetupStepsModel
