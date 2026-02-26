import useApi from '@/bcsc-theme/api/hooks/useApi'
import { withAccount } from '@/bcsc-theme/api/hooks/withAccountGuard'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useAlerts } from '@/hooks/useAlerts'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as BcscCore from 'react-native-bcsc-core'
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
  const { updateVerificationRequest, updateAccountFlags, deleteVerificationData, clearSecureState } = useSecureActions()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { cancelVerificationRequestAlert } = useAlerts(navigation)
  const registrationService = useRegistrationService()

  // Get unified step state (completed, focused, subtext for each step)
  const steps = useSetupSteps(store)

  /**
   * Handle resetting the card registration process.
   *
   * Note: This will reset the completion of all setup steps excluding step 1 (account nickname).
   * Why? Account nickname is excluded as it is independent to the card registration process (setup step 2).
   *
   * @returns Promise that resolves when the reset process is complete
   */
  const handleResetCardRegistration = useCallback(async () => {
    try {
      withAccount(async (account) => {
        // 1. Clear the secure state and trigger a setup steps re-render
        clearSecureState({
          hasAccount: true,
          isHydrated: true,
          walletKey: store.bcscSecure.walletKey, // used for authentication
        })

        // 2. Get the previous device auth for re-registering the account
        const securityMethod = await BcscCore.getAccountSecurityMethod()

        await Promise.all([
          // 3. Clean up registration on the backend
          registrationService.deleteRegistration(account.clientID),
          // 4. Re-register the device and generate a new account (prevents "client is in invalid state/statue" errors)
          registrationService.register(securityMethod),
          // 4. Delete any persisted verification data in device file system
          deleteVerificationData(),
        ])
      })
    } catch (error) {
      logger.error('[handleResetCardRegistration] Error resetting card registration', error as Error)
    }
  }, [clearSecureState, deleteVerificationData, logger, registrationService, store.bcscSecure.walletKey])

  useFocusEffect(
    useCallback(() => {
      if (steps.id.completed || (!steps.address.completed && !steps.email.completed)) {
        // If ID step completed or address and email are both incomplete, we can assume workflow is normal
        return
      }

      // This can be triggered by users backing out when they have partially completed step 2 (id collection)
      logger.debug('[useSetupStepsModel] Invalid steps detected, cancelling registration and resetting state.', {
        idStepCompleted: steps.id.completed,
        addressStepCompleted: steps.address.completed,
        emailStepCompleted: steps.email.completed,
      })
      handleResetCardRegistration()
    }, [handleResetCardRegistration, logger, steps.address.completed, steps.email.completed, steps.id.completed])
  )

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
    handleResetCardRegistration,
  }
}

export default useSetupStepsModel
