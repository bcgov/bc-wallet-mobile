import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCState } from '@/store'
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
  const Step1IdsCompleted = bcscRegistered || nonBcscRegistered
  const Step2AddressCompleted = Boolean(store.bcsc.deviceCode)
  const Step3EmailCompleted = Boolean(emailAddress && emailConfirmed)
  const Step4VerificationCompleted = store.bcsc.verified

  return useMemo(
    () => ({
      // step 1: provide ID(s)
      id: {
        completed: Step1IdsCompleted,
        focused: !Step1IdsCompleted,
        // additional state for UI
        nonBcscNeedsAdditionalCard: nonBcscNeedsAdditionalCard,
        nonPhotoBcscNeedsAdditionalCard: nonPhotoBcscNeedsAdditionalCard,
      },
      // step 2: provide residential address (non BCSC cards only)
      address: {
        completed: Step2AddressCompleted,
        focused: Step1IdsCompleted && !Step2AddressCompleted,
      },
      // step 3: provide and confirm email (non BCSC cards only)
      email: {
        completed: Step3EmailCompleted,
        focused: Step1IdsCompleted && Step2AddressCompleted && !Step3EmailCompleted,
      },
      // step 4: verify identity (in person, video or live call)
      verify: {
        completed: Step4VerificationCompleted,
        focused:
          Step1IdsCompleted &&
          Step2AddressCompleted &&
          Step3EmailCompleted &&
          !Step4VerificationCompleted &&
          !store.bcsc.pendingVerification,
      },
    }),
    [
      Step1IdsCompleted,
      Step2AddressCompleted,
      Step3EmailCompleted,
      Step4VerificationCompleted,
      nonBcscNeedsAdditionalCard,
      nonPhotoBcscNeedsAdditionalCard,
      store.bcsc.pendingVerification,
    ]
  )
}
