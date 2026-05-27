import { AccountSetupType, BCState } from '@/store'
import { BCSCCardProcess, EvidenceMetadata } from 'react-native-bcsc-core'

/**
 * Validates that an evidence item is fully completed.
 * An evidence is complete when:
 * - It has at least 1 photo | NOTE: Some evidence types may only require a photo (e.g. passport)
 * - It has a document number entered
 */
const isEvidenceComplete = (evidence: EvidenceMetadata): boolean => {
  const hasRequiredPhotos = evidence.metadata.length >= 1
  const hasDocumentNumber = Boolean(evidence.documentNumber)
  return hasRequiredPhotos && hasDocumentNumber
}

export interface StepCompletionResult {
  id: {
    completed: boolean
    focused: boolean
    nonBcscNeedsAdditionalCard: boolean
    nonPhotoBcscNeedsAdditionalCard: boolean
  }
  address: { completed: boolean; focused: boolean }
  email: { completed: boolean; focused: boolean }
  verify: { completed: boolean; focused: boolean }
  transfer: { completed: boolean; focused: boolean }
  /** The currently focused step, or null if all complete */
  currentStep: 'id' | 'address' | 'email' | 'verify' | 'transfer' | null
  /** Whether all steps are completed */
  allCompleted: boolean
}

/**
 * Pure computation of which setup steps are complete / focused for the given store.
 *
 * Single source of truth for "which verification step is the user on?" — drives
 * `getResumeStepRoute` (initial-route + post-step navigation) and the
 * Start/Continue verification notification copy.
 *
 * Pure & React-free so callers can pass a "predicted" post-update store snapshot
 * to compute the next step before React commits the dispatched updates.
 */
export const computeSetupStepCompletion = (store: BCState): StepCompletionResult => {
  const bcscSerialNumber = store.bcscSecure.serial || null
  const emailAddress = store.bcscSecure.emailAddress || null
  const isEmailVerified = Boolean(store.bcscSecure.isEmailVerified)
  const userSkippedEmailVerification = Boolean(store.bcscSecure.userSkippedEmailVerification)
  const hasSerial = Boolean(bcscSerialNumber)

  const isCombinedCard = store.bcscSecure.cardProcess === BCSCCardProcess.BCSCPhoto
  const isPhotoCard = store.bcscSecure.cardProcess === BCSCCardProcess.BCSCPhoto
  const isNonPhotoCard = store.bcscSecure.cardProcess === BCSCCardProcess.BCSCNonPhoto
  const isNonBCSCCards = store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC

  const completedEvidenceCount = store.bcscSecure.additionalEvidenceData.filter(isEvidenceComplete).length
  const hasCompletedPhotoIdEvidence = store.bcscSecure.additionalEvidenceData.some(
    (item) => item.evidenceType?.has_photo && isEvidenceComplete(item)
  )

  const nonPhotoBcscNeedsAdditionalCard = isNonPhotoCard && hasSerial && !hasCompletedPhotoIdEvidence
  const nonBcscNeedsAdditionalCard = isNonBCSCCards && completedEvidenceCount === 1

  const bcscRegistered = Boolean((isCombinedCard || isPhotoCard) && bcscSerialNumber)
  const nonPhotoBcscRegistered = isNonPhotoCard && hasSerial && hasCompletedPhotoIdEvidence
  const nonBcscRegistered = isNonBCSCCards && completedEvidenceCount === 2

  const step4Completed = Boolean(store.bcscSecure.verified || store.bcscSecure.userSubmittedVerificationVideo)
  const step1Completed = step4Completed || bcscRegistered || nonPhotoBcscRegistered || nonBcscRegistered
  const step2Completed = step4Completed || (step1Completed && Boolean(store.bcscSecure.deviceCode))
  const step3Completed =
    step4Completed || (step1Completed && ((Boolean(emailAddress) && isEmailVerified) || userSkippedEmailVerification))

  const step1Focused = !step1Completed
  const step2Focused = step1Completed && !step2Completed
  const step3Focused = step1Completed && step2Completed && !step3Completed
  const step4Focused = step1Completed && step2Completed && step3Completed
  const step5Focused = store.bcsc.accountSetupType === AccountSetupType.TransferAccount

  const currentStep: StepCompletionResult['currentStep'] = step1Focused
    ? 'id'
    : step2Focused
      ? 'address'
      : step3Focused
        ? 'email'
        : step4Focused
          ? 'verify'
          : step5Focused
            ? 'transfer'
            : null

  return {
    id: {
      completed: step1Completed,
      focused: step1Focused,
      nonBcscNeedsAdditionalCard,
      nonPhotoBcscNeedsAdditionalCard,
    },
    address: { completed: step2Completed, focused: step2Focused },
    email: { completed: step3Completed, focused: step3Focused },
    verify: { completed: step4Completed, focused: step4Focused },
    // leaving transfer.completed false: once the user has scanned they don't re-enter the transfer flow
    transfer: { completed: false, focused: step5Focused },
    currentStep,
    allCompleted: step1Completed && step2Completed && step3Completed && step4Completed,
  }
}
