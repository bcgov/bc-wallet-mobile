import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCState, getSelectedNickname } from '@/store'
import { useMemo } from 'react'

/**
 * Hook to determine the completion and focus state of each step in the identity verification setup process.
 *
 * Note: This hook could export explicit controls for setting focus and completion state of each step,
 * but currently it derives its state from the global store. If the logic for determining these states
 * becomes more complex or requires user interaction, consider adding setter functions to this hook.
 *
 * @returns {*} An object containing the completion and focus state of each step.
 */
export const useSetupSteps = (store: BCState) => {
  // store + card attributes
  const nickname = getSelectedNickname(store) || null
  const bcscSerialNumber = store.bcsc.serial || null
  const emailAddress = store.bcsc.email || null
  const emailConfirmed = Boolean(store.bcsc.emailConfirmed)
  const isNonPhotoCard = store.bcsc.cardType === BCSCCardType.NonPhoto
  const isNonBCSCCards = store.bcsc.cardType === BCSCCardType.Other
  const isNoneCard = store.bcsc.cardType === BCSCCardType.None

  // additional ID requirements
  const missingPhotoId = !store.bcsc.additionalEvidenceData.some((item) => item.evidenceType.has_photo)
  const nonBcscNeedsAdditionalCard = isNonBCSCCards && store.bcsc.additionalEvidenceData.length === 1
  const nonPhotoBcscNeedsAdditionalCard = isNonPhotoCard && missingPhotoId

  // card registration state
  const bcscRegistered = Boolean(
    !isNonBCSCCards && !isNoneCard && bcscSerialNumber && emailAddress && !nonPhotoBcscNeedsAdditionalCard
  )
  const nonBcscRegistered =
    isNonBCSCCards && store.bcsc.additionalEvidenceData.length === 2 && !nonBcscNeedsAdditionalCard

  // step completion states
  const Step1NicknameCompleted = Boolean(nickname)
  const Step2IdsCompleted = bcscRegistered || nonBcscRegistered
  const Step3AddressCompleted = Boolean(store.bcsc.deviceCode)
  const Step4EmailCompleted = Boolean(emailAddress && emailConfirmed)
  const Step5VerificationCompleted = store.bcsc.verified && !store.bcsc.pendingVerification

  return useMemo(
    () => ({
      // step 1: provide nickname account
      nickname: {
        completed: Step1NicknameCompleted,
        focused: !Step1NicknameCompleted,
      },
      // step 2: provide ID(s)
      id: {
        completed: Step2IdsCompleted,
        focused: Step1NicknameCompleted && !Step2IdsCompleted,
        // additional state for UI
        nonBcscNeedsAdditionalCard: nonBcscNeedsAdditionalCard,
        nonPhotoBcscNeedsAdditionalCard: nonPhotoBcscNeedsAdditionalCard,
      },
      // step 3: provide residential address (non BCSC cards only)
      address: {
        completed: Step3AddressCompleted,
        focused: Step2IdsCompleted && !Step3AddressCompleted,
      },
      // step 4: provide and confirm email (non BCSC cards only)
      email: {
        completed: Step4EmailCompleted,
        focused: Step2IdsCompleted && Step3AddressCompleted && !Step4EmailCompleted,
      },
      // step 5: verify identity (in person, video or live call)
      verify: {
        completed: Step5VerificationCompleted,
        focused: Step2IdsCompleted && Step3AddressCompleted && Step4EmailCompleted && !Step5VerificationCompleted,
      },
    }),
    [
      Step1NicknameCompleted,
      Step2IdsCompleted,
      Step3AddressCompleted,
      Step4EmailCompleted,
      Step5VerificationCompleted,
      nonBcscNeedsAdditionalCard,
      nonPhotoBcscNeedsAdditionalCard,
    ]
  )
}
