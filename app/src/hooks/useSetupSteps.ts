import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { formatAddressForDisplay } from '@/bcsc-theme/utils/address-utils'
import { AdditionalEvidenceData, BCState } from '@/store'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Validates that an evidence item is fully completed.
 * An evidence is complete when:
 * - It has at least 1 photo | NOTE: Some evidence types may only require a photo (e.g. passport)
 * - It has a document number entered
 */
const isEvidenceComplete = (evidence: AdditionalEvidenceData): boolean => {
  const hasRequiredPhotos = evidence.metadata.length >= 1
  const hasDocumentNumber = Boolean(evidence.documentNumber)
  return hasRequiredPhotos && hasDocumentNumber
}

/**
 * Represents the state of a single setup step
 */
export interface StepState {
  completed: boolean
  focused: boolean
  subtext: string[]
}

/**
 * Extended step state for the ID step which has additional flags
 */
export interface IdStepState extends StepState {
  nonBcscNeedsAdditionalCard: boolean
  nonPhotoBcscNeedsAdditionalCard: boolean
}

/**
 * Return type for the useSetupSteps hook
 */
export interface SetupStepsResult {
  nickname: StepState
  id: IdStepState
  address: StepState
  email: StepState
  verify: StepState
  /** The currently focused step, or null if all complete */
  currentStep: 'nickname' | 'id' | 'address' | 'email' | 'verify' | null
  /** Whether all steps are completed */
  allCompleted: boolean
}

/**
 * Hook to determine the completion, focus state, and subtext of each step
 * in the identity verification setup process.
 *
 * This is the single source of truth for all step-related state.
 *
 * @param store - The BC application state
 * @returns An object containing the state of each step including completion, focus, and subtext
 */
export const useSetupSteps = (store: BCState): SetupStepsResult => {
  const { t } = useTranslation()

  return useMemo(() => {
    // ---- Derived state from store ----
    const nickname = store.bcsc.selectedNickname || null
    const bcscSerialNumber = store.bcsc.serial || null
    const emailAddress = store.bcsc.email || null
    const emailConfirmed = Boolean(store.bcsc.emailConfirmed)
    const hasSerial = Boolean(bcscSerialNumber)

    // Card types
    const isCombinedCard = store.bcsc.cardType === BCSCCardType.Combined
    const isPhotoCard = store.bcsc.cardType === BCSCCardType.Photo
    const isNonPhotoCard = store.bcsc.cardType === BCSCCardType.NonPhoto
    const isNonBCSCCards = store.bcsc.cardType === BCSCCardType.Other

    // Count of fully validated evidence cards (at least 1 photo taken + document number entered)
    const completedEvidenceCount = store.bcsc.additionalEvidenceData.filter(isEvidenceComplete).length

    // Check if user has any completed photo ID evidence
    const hasCompletedPhotoIdEvidence = store.bcsc.additionalEvidenceData.some(
      (item) => item.evidenceType.has_photo && isEvidenceComplete(item)
    )

    // Non-photo BCSC needs an additional photo ID card if serial is present but no completed photo evidence
    const nonPhotoBcscNeedsAdditionalCard = isNonPhotoCard && hasSerial && !hasCompletedPhotoIdEvidence

    // Non-BCSC cards require 2 fully validated cards
    const nonBcscNeedsAdditionalCard = isNonBCSCCards && completedEvidenceCount === 1

    // Card registration state
    const bcscRegistered = Boolean((isCombinedCard || isPhotoCard) && bcscSerialNumber)
    const nonPhotoBcscRegistered = isNonPhotoCard && hasSerial && hasCompletedPhotoIdEvidence
    const nonBcscRegistered = isNonBCSCCards && completedEvidenceCount === 2

    // ---- Step completion states ----
    const step1Completed = Boolean(nickname)
    const step2Completed = bcscRegistered || nonPhotoBcscRegistered || nonBcscRegistered
    const step3Completed = Boolean(store.bcsc.deviceCode)
    const step4Completed = Boolean(emailAddress && emailConfirmed)
    const step5Completed = Boolean(store.bcsc.verified || store.bcsc.pendingVerification)

    // ---- Step focus states ----
    const step1Focused = !step1Completed
    const step2Focused = step1Completed && !step2Completed
    const step3Focused = step2Completed && !step3Completed
    const step4Focused = step2Completed && step3Completed && !step4Completed
    const step5Focused = step2Completed && step3Completed && step4Completed && !step5Completed

    // ---- Subtext generators ----
    const getStep1Subtext = (): string[] => {
      if (step1Completed && store.bcsc.selectedNickname) {
        return [`${t('BCSC.NicknameAccount.AccountName')}: ${store.bcsc.selectedNickname}`]
      }
      return [t('BCSC.NicknameAccount.AccountName')]
    }

    const getStep2Subtext = (): string[] => {
      // Only show document info if step 2 is explicitly completed
      if (!step2Completed) {
        return [t('BCSC.Steps.ScanOrTakePhotos')]
      }

      const cards: string[] = []

      // If the BCSC card is registered, show the BCSC serial number
      if (store.bcsc.serial) {
        cards.push(t('BCSC.Steps.GetVerificationStep2Subtext1', { serial: store.bcsc.serial }))
      }

      // If the user has added additional evidence, add each to the list
      for (const evidence of store.bcsc.additionalEvidenceData.filter(isEvidenceComplete)) {
        cards.push(
          t('BCSC.Steps.GetVerificationStep2Subtext2', {
            evidenceType: evidence.evidenceType.evidence_type,
            documentNumber: evidence.documentNumber,
          })
        )
      }

      return cards.length ? cards : [t('BCSC.Steps.ScanOrTakePhotos')]
    }

    const getStep3Subtext = (): string[] => {
      // For BCSC card with serial, address comes from the card
      if (step2Completed && store.bcsc.serial) {
        return [t('BCSC.Steps.GetVerificationStep3Subtext1')]
      }

      // Only show address if step 3 is completed
      if (step3Completed && store.bcsc.userMetadata?.address) {
        return [
          t('BCSC.Steps.GetVerificationStep3Subtext2', {
            address: formatAddressForDisplay(store.bcsc.userMetadata.address),
          }),
        ]
      }

      return [t('BCSC.Steps.GetVerificationStep3Subtext3')]
    }

    const getStep5Subtext = (): string[] => {
      if (step5Focused && store.bcsc.deviceCodeExpiresAt) {
        const expirationDate = store.bcsc.deviceCodeExpiresAt.toLocaleString(t('BCSC.LocaleStringFormat'), {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
        return [t('BCSC.Steps.GetVerificationStep5Subtext1', { expirationDate })]
      }

      if (nonPhotoBcscNeedsAdditionalCard) {
        return [t('BCSC.Steps.GetVerificationStep5Subtext2')]
      }

      return [t('BCSC.Steps.GetVerificationStep5Subtext3')]
    }

    // ---- Determine current step ----
    const getCurrentStep = (): SetupStepsResult['currentStep'] => {
      if (step1Focused) return 'nickname'
      if (step2Focused) return 'id'
      if (step3Focused) return 'address'
      if (step4Focused) return 'email'
      if (step5Focused) return 'verify'
      return null
    }

    // ---- Build result object ----
    return {
      nickname: {
        completed: step1Completed,
        focused: step1Focused,
        subtext: getStep1Subtext(),
      },
      id: {
        completed: step2Completed,
        focused: step2Focused,
        subtext: getStep2Subtext(),
        nonBcscNeedsAdditionalCard,
        nonPhotoBcscNeedsAdditionalCard,
      },
      address: {
        completed: step3Completed,
        focused: step3Focused,
        subtext: getStep3Subtext(),
      },
      email: {
        completed: step4Completed,
        focused: step4Focused,
        subtext: [], // Email step has custom children rendering
      },
      verify: {
        completed: step5Completed,
        focused: step5Focused,
        subtext: getStep5Subtext(),
      },
      currentStep: getCurrentStep(),
      allCompleted: step1Completed && step2Completed && step3Completed && step4Completed && step5Completed,
    }
  }, [store, t])
}
