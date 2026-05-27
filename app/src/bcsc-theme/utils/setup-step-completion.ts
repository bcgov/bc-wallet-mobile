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

interface IdStepStatus {
  registered: boolean
  nonPhotoBcscNeedsAdditionalCard: boolean
  nonBcscNeedsAdditionalCard: boolean
}

const computeIdStepStatus = (store: BCState): IdStepStatus => {
  const { cardProcess, serial, additionalEvidenceData } = store.bcscSecure
  const hasSerial = Boolean(serial)
  const isCombinedCard = cardProcess === BCSCCardProcess.BCSCPhoto
  const isPhotoCard = cardProcess === BCSCCardProcess.BCSCPhoto
  const isNonPhotoCard = cardProcess === BCSCCardProcess.BCSCNonPhoto
  const isNonBCSCCards = cardProcess === BCSCCardProcess.NonBCSC

  const completedEvidenceCount = additionalEvidenceData.filter(isEvidenceComplete).length
  const hasCompletedPhotoIdEvidence = additionalEvidenceData.some(
    (item) => item.evidenceType?.has_photo && isEvidenceComplete(item)
  )

  const bcscRegistered = Boolean((isCombinedCard || isPhotoCard) && serial)
  const nonPhotoBcscRegistered = isNonPhotoCard && hasSerial && hasCompletedPhotoIdEvidence
  const nonBcscRegistered = isNonBCSCCards && completedEvidenceCount === 2

  return {
    registered: bcscRegistered || nonPhotoBcscRegistered || nonBcscRegistered,
    nonPhotoBcscNeedsAdditionalCard: isNonPhotoCard && hasSerial && !hasCompletedPhotoIdEvidence,
    nonBcscNeedsAdditionalCard: isNonBCSCCards && completedEvidenceCount === 1,
  }
}

const determineCurrentStep = (focused: {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  step5: boolean
}): StepCompletionResult['currentStep'] => {
  if (focused.step1) {
    return 'id'
  }
  if (focused.step2) {
    return 'address'
  }
  if (focused.step3) {
    return 'email'
  }
  if (focused.step4) {
    return 'verify'
  }
  if (focused.step5) {
    return 'transfer'
  }
  return null
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
  const {
    emailAddress,
    isEmailVerified,
    userSkippedEmailVerification,
    deviceCode,
    verified,
    userSubmittedVerificationVideo,
  } = store.bcscSecure

  const idStatus = computeIdStepStatus(store)

  const step4Completed = Boolean(verified || userSubmittedVerificationVideo)
  const step1Completed = step4Completed || idStatus.registered
  const step2Completed = step4Completed || (step1Completed && Boolean(deviceCode))
  const emailStepSatisfied =
    (Boolean(emailAddress) && Boolean(isEmailVerified)) || Boolean(userSkippedEmailVerification)
  const step3Completed = step4Completed || (step1Completed && emailStepSatisfied)

  const focused = {
    step1: !step1Completed,
    step2: step1Completed && !step2Completed,
    step3: step1Completed && step2Completed && !step3Completed,
    step4: step1Completed && step2Completed && step3Completed,
    step5: store.bcsc.accountSetupType === AccountSetupType.TransferAccount,
  }

  return {
    id: {
      completed: step1Completed,
      focused: focused.step1,
      nonBcscNeedsAdditionalCard: idStatus.nonBcscNeedsAdditionalCard,
      nonPhotoBcscNeedsAdditionalCard: idStatus.nonPhotoBcscNeedsAdditionalCard,
    },
    address: { completed: step2Completed, focused: focused.step2 },
    email: { completed: step3Completed, focused: focused.step3 },
    verify: { completed: step4Completed, focused: focused.step4 },
    // leaving transfer.completed false: once the user has scanned they don't re-enter the transfer flow
    transfer: { completed: false, focused: focused.step5 },
    currentStep: determineCurrentStep(focused),
    allCompleted: step1Completed && step2Completed && step3Completed && step4Completed,
  }
}
