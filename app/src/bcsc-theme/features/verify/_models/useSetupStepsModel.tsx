import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCState } from '@/store'
import { BCSCCardProcess } from '@bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

/**
 * Model hook for the SetupStepsScreen that provides:
 * - Step state (completed, focused, subtext) from useSetupSteps
 * - Navigation actions for each step
 * - Handlers for checking status and cancelling verification
 */
const useSetupStepsModel = (navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SetupSteps>) => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { updateTokens, updateVerificationRequest, updateAccountFlags } = useSecureActions()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // Get unified step state (completed, focused, subtext for each step)
  const steps = useSetupSteps(store)

  /**
   * Check the status of a pending verification request
   */
  const handleCheckStatus = useCallback(async () => {
    if (!store.bcscSecure.verificationRequestId) {
      throw new Error(t('BCSC.Steps.VerificationIDMissing'))
    }

    const { status } = await evidence.getVerificationRequestStatus(store.bcscSecure.verificationRequestId)

    if (status === 'verified') {
      if (!store.bcscSecure.deviceCode || !store.bcscSecure.userCode) {
        throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
      }

      const { refresh_token } = await token.checkDeviceCodeStatus(
        store.bcscSecure.deviceCode,
        store.bcscSecure.userCode,
      )

      if (refresh_token) {
        await updateTokens({ refreshToken: refresh_token })
      }

      navigation.navigate(BCSCScreens.VerificationSuccess)
    } else {
      navigation.navigate(BCSCScreens.PendingReview)
    }
  }, [
    store.bcscSecure.verificationRequestId,
    store.bcscSecure.deviceCode,
    store.bcscSecure.userCode,
    evidence,
    token,
    navigation,
    updateTokens,
    t,
  ])

  /**
   * Cancel a pending verification request
   */
  const handleCancelVerification = useCallback(async () => {
    Alert.alert(t('BCSC.Steps.AreYouSure'), t('BCSC.Steps.YourVerificationRequestWillBeDeleted'), [
      {
        text: t('BCSC.Steps.DeleteVerifyRequest'),
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
        onPress: () => {},
        style: 'cancel',
      },
    ])
  }, [
    store.bcscSecure.verificationRequestId,
    evidence,
    logger,
    navigation,
    updateVerificationRequest,
    updateAccountFlags,
    t,
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
          navigation.navigate(BCSCScreens.EvidenceTypeList)
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
        navigation.navigate(BCSCScreens.EnterEmail, { cardProcess: store.bcscSecure.cardProcess! as BCSCCardProcess })
      },

      verify: () => {
        navigation.navigate(BCSCScreens.VerificationMethodSelection)
      },
    }),
    [
      navigation,
      steps.id.nonBcscNeedsAdditionalCard,
      steps.id.nonPhotoBcscNeedsAdditionalCard,
      steps.id.completed,
      store.bcscSecure.cardProcess,
    ],
  )

  return {
    steps,
    stepActions,
    handleCheckStatus,
    handleCancelVerification,
  }
}

export default useSetupStepsModel
