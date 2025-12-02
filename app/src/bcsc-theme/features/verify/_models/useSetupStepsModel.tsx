import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCDispatchAction, BCState } from '@/store'
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
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // Get unified step state (completed, focused, subtext for each step)
  const steps = useSetupSteps(store)

  /**
   * Check the status of a pending verification request
   */
  const handleCheckStatus = useCallback(async () => {
    if (!store.bcsc.verificationRequestId) {
      throw new Error(t('BCSC.Steps.VerificationIDMissing'))
    }

    const { status } = await evidence.getVerificationRequestStatus(store.bcsc.verificationRequestId)

    if (status === 'verified') {
      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error(t('BCSC.Steps.DeviceCodeOrUserCodeMissing'))
      }

      const { refresh_token } = await token.checkDeviceCodeStatus(store.bcsc.deviceCode, store.bcsc.userCode)

      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })
      }

      navigation.navigate(BCSCScreens.VerificationSuccess)
    } else {
      navigation.navigate(BCSCScreens.PendingReview)
    }
  }, [
    store.bcsc.verificationRequestId,
    store.bcsc.deviceCode,
    store.bcsc.userCode,
    evidence,
    token,
    dispatch,
    navigation,
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
            await evidence.cancelVerificationRequest(store.bcsc.verificationRequestId!)
          } catch (error) {
            logger.error(`Error cancelling verification request: ${error}`)
          } finally {
            dispatch({ type: BCDispatchAction.UPDATE_PENDING_VERIFICATION, payload: [false] })
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
  }, [store.bcsc.verificationRequestId, evidence, logger, dispatch, navigation, t])

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
        navigation.navigate(BCSCScreens.EnterEmail, { cardType: store.bcsc.cardType })
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
      store.bcsc.cardType,
    ]
  )

  return {
    steps,
    stepActions,
    handleCheckStatus,
    handleCancelVerification,
  }
}

export default useSetupStepsModel
