import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCState } from '@/store'
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
const useSetupStepsModel = (navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SetupSteps>) => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { emitAlert } = useErrorAlert()

  // Get unified step state (completed, focused, subtext for each step)
  const steps = useSetupSteps(store)

  /**
   * Check the status of a pending verification request
   */
  const handleCheckStatus = useCallback(async () => {
    setIsCheckingStatus(true)
    try {
      if (store.bcscSecure.refreshToken) {
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
  }, [
    store.bcscSecure.refreshToken,
    store.bcscSecure.verificationRequestId,
    store.bcscSecure.deviceCode,
    store.bcscSecure.userCode,
    evidence,
    navigation,
    t,
    token,
    logger,
  ])

  /**
   * Cancel a pending verification request
   */
  const handleCancelVerification = useCallback(async () => {
    emitAlert(t('Alerts.CancelVerificationRequest.Title'), t('Alerts.CancelVerificationRequest.Description'), {
      event: AppEventCode.CANCEL_VERIFICATION_REQUEST,
      actions: [
        {
          text: t('Alerts.CancelVerificationRequest.Action1'),
          style: 'destructive',
          onPress: async () => {
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
              await updateAccountFlags({
                userSubmittedVerificationVideo: false,
              })
              navigation.navigate(BCSCScreens.VerificationMethodSelection)
            }
          },
        },
        {
          text: t('Global.Cancel'),
          style: 'cancel',
        },
      ],
    })
  }, [
    emitAlert,
    t,
    store.bcscSecure.verificationRequestId,
    evidence,
    logger,
    updateVerificationRequest,
    updateAccountFlags,
    navigation,
  ])

  /**
   * Navigation actions for each step
   */
  const stepActions = useMemo(
    () => ({
      nickname: () => {
        navigation.navigate(BCSCScreens.NicknameAccount)
      },

      id: () => {
        if (steps.id.nonBcscNeedsAdditionalCard) {
          navigation.navigate(BCSCScreens.EvidenceTypeList, {
            cardProcess: BCSCCardProcess.NonBCSC,
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
      store.bcscSecure.cardProcess,
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
