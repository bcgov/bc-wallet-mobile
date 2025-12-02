import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { formatAddressForDisplay } from '@/bcsc-theme/utils/address-utils'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

const useSetupStepsModel = (navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SetupSteps>) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // tracks the current step state (completed and focused)
  const step = useSetupSteps(store)

  const handleCheckStatus = async () => {
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
  }

  const handleCancelVerification = async () => {
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
  }

  /**
   * Returns the subtext for Step 1 (Nickname Account) of the verification process.
   *
   * @returns {*} {string[]} An array of strings representing the subtext for Step 1.
   */
  const getVerificationStep1Subtext = useCallback((): string[] => {
    if (step.nickname.completed && store.bcsc.selectedNickname) {
      return [`${t('BCSC.NicknameAccount.AccountName')}: ${store.bcsc.selectedNickname}`]
    }

    return [t('BCSC.NicknameAccount.AccountName')]
  }, [t, step.nickname.completed, store])

  /**
   * Returns the subtext for Step 2 (Identification) of the verification process.
   *
   * IMPORTANT: Only shows document info when step 2 is COMPLETED (committed).
   * This prevents document names from appearing when user has only started the step
   * but backed out before completing it.
   *
   * @returns {*} {string[]} An array of strings representing the subtext for Step 2.
   */
  const getVerificationStep2Subtext = useCallback((): string[] => {
    // Only show document info if step 2 is explicitly completed
    if (!step.id.completed) {
      return [t('BCSC.Steps.ScanOrTakePhotos')]
    }

    const cards: string[] = []

    // if the bcsc card is registered, show the bcsc serial number
    if (store.bcsc.serial) {
      cards.push(t('BCSC.Steps.GetVerificationStep2Subtext1', { serial: store.bcsc.serial }))
    }

    // if the user has added additional evidence, add each to the list
    for (const evidence of store.bcsc.additionalEvidenceData) {
      cards.push(
        t('BCSC.Steps.GetVerificationStep2Subtext2', {
          evidenceType: evidence.evidenceType,
          documentNumber: evidence.documentNumber,
        })
      )
    }

    if (cards.length) {
      return cards
    }

    // fallback - shouldn't happen if step is completed, but just in case
    return [t('BCSC.Steps.ScanOrTakePhotos')]
  }, [store.bcsc.additionalEvidenceData, store.bcsc.serial, step.id.completed, t])

  /**
   * Returns the subtext for Step 3 (Residential Address) of the verification process.
   *
   * Only shows address info when step 3 is COMPLETED.
   *
   * @returns {*} {string} The subtext for Step 3.
   */
  const getVerificationStep3Subtext = useCallback(() => {
    // For BCSC card with serial, address comes from the card
    if (step.id.completed && store.bcsc.serial) {
      return t('BCSC.Steps.GetVerificationStep3Subtext1')
    }

    // Only show address if step 3 is completed
    if (step.address.completed && store.bcsc.userMetadata?.address) {
      return t('BCSC.Steps.GetVerificationStep3Subtext2', {
        address: formatAddressForDisplay(store.bcsc.userMetadata.address),
      })
    }

    return t('BCSC.Steps.GetVerificationStep3Subtext3')
  }, [step.id.completed, step.address.completed, store.bcsc.serial, store.bcsc.userMetadata?.address, t])

  /**
   * Returns the subtext for Step 5 (Verify Identity) of the verification process.
   *
   * @returns {*} {string} The subtext for step 5
   */
  const getVerificationStep5Subtext = useCallback(() => {
    if (step.verify.focused && store.bcsc.deviceCodeExpiresAt) {
      const expirationDate = store.bcsc.deviceCodeExpiresAt.toLocaleString(t('BCSC.LocaleStringFormat'), {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      return t('BCSC.Steps.GetVerificationStep5Subtext1', { expirationDate })
    }

    if (step.id.nonPhotoBcscNeedsAdditionalCard) {
      return t('BCSC.Steps.GetVerificationStep5Subtext2')
    }

    return t('BCSC.Steps.GetVerificationStep5Subtext3')
  }, [step.verify.focused, step.id.nonPhotoBcscNeedsAdditionalCard, store.bcsc.deviceCodeExpiresAt, t])

  return {
    step,
    handleCheckStatus,
    handleCancelVerification,
    getVerificationStep1Subtext,
    getVerificationStep2Subtext,
    getVerificationStep3Subtext,
    getVerificationStep5Subtext,
  }
}

export default useSetupStepsModel
