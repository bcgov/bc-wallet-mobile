import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { isUserVerified } from './bcsc-credential'
import { isEvidenceAwaitingDocumentNumber, isEvidenceCaptureIncomplete } from './card-utils'
import { computeSetupStepCompletion } from './setup-step-completion'

export type ResumeStepRoute = {
  name: keyof BCSCVerifyStackParams
  params?: BCSCVerifyStackParams[keyof BCSCVerifyStackParams]
}

/**
 * Returns the verify-stack route the user should land on when resuming the
 * verification journey for the given store state.
 *
 * Single source of truth for "which screen should the user be on?" — used by
 * VerifyStack's initialRouteName, recovery error policies, and step-completion
 * navigations. Step-completion callers pass a "predicted" post-update store
 * snapshot so the result reflects the just-persisted state (the React closure's
 * `store` would still be stale at navigation time).
 */
export const getResumeStepRoute = (store: BCState): ResumeStepRoute => {
  // Corrupted/unreadable token file: the user must re-establish their session
  // before any other resume logic can be trusted.
  if (store.bcscSecure.sessionRecoveryRequired) {
    return { name: BCSCScreens.SessionRecovery }
  }

  if (isUserVerified(store.bcscSecure)) {
    return { name: BCSCScreens.VerificationSuccess }
  }

  if (store.bcscSecure.userSubmittedVerificationVideo) {
    return { name: BCSCScreens.PendingReview }
  }

  const completion = computeSetupStepCompletion(store)

  // The user hasn't chosen how to set up this device yet (verify a new account vs. connect
  // an already-verified device via QR). Ask first — this is the entry of the verify journey,
  // reached right after the "Verify Your Account" prompt. Only bounce them here when there's no
  // verification progress to resume (id step still focused); a user who already has progress but
  // no recorded setup type (e.g. migrated from a build predating accountSetupType) must resume
  // their step rather than be sent back to the question and lose it.
  if (!store.bcsc.accountSetupType && completion.id.focused) {
    return { name: BCSCScreens.AccountSetup }
  }

  switch (completion.currentStep) {
    case 'id': {
      // A half-finished evidence — all required photos captured but no document number
      // entered yet — means the user left while on EvidenceIDCollection. Resume them
      // straight back there so their photos aren't discarded by EvidenceTypeList's
      // incomplete-evidence cleanup (which would otherwise send them to the flow's start).
      const evidenceAwaitingDocumentNumber = store.bcscSecure.additionalEvidenceData.find(
        isEvidenceAwaitingDocumentNumber
      )
      if (evidenceAwaitingDocumentNumber?.evidenceType) {
        return {
          name: BCSCScreens.EvidenceIDCollection,
          params: { cardType: evidenceAwaitingDocumentNumber.evidenceType },
        }
      }
      // An evidence that's been selected but whose photo capture isn't finished (e.g. the user left
      // between the front and back) means capture was interrupted. Mid-capture photos are never
      // committed, so they've been discarded; resume the user to IDPhotoInformation to restart
      // capture for that ID from the first side rather than dropping them on the document-number
      // screen or bouncing them to the start of the ID flow.
      const evidenceCaptureIncomplete = store.bcscSecure.additionalEvidenceData.find(isEvidenceCaptureIncomplete)
      if (evidenceCaptureIncomplete?.evidenceType) {
        return {
          name: BCSCScreens.IDPhotoInformation,
          params: { cardType: evidenceCaptureIncomplete.evidenceType },
        }
      }
      if (completion.id.nonBcscNeedsAdditionalCard) {
        return { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } }
      }
      if (completion.id.nonPhotoBcscNeedsAdditionalCard) {
        return { name: BCSCScreens.AdditionalIdentificationRequired }
      }
      // The user entered (or scanned) a BC Services Card serial and left before finishing the
      // birthdate → device-authorization step. Their serial is still saved, so resume them on the
      // birthdate screen rather than sending them back to the start of the ID step. A set
      // cardProcess or deviceCode means the card is already authorized, or the user is in the
      // Non-BCSC evidence flow — both handled above — so this only catches the pre-authorization
      // serial state.
      if (store.bcscSecure.serial && !store.bcscSecure.deviceCode && !store.bcscSecure.cardProcess) {
        return { name: BCSCScreens.EnterBirthdate }
      }
      return { name: BCSCScreens.IdentitySelection }
    }
    case 'address':
      return { name: BCSCScreens.ResidentialAddress }
    case 'email':
      return { name: BCSCScreens.EnterEmail, params: { cardProcess: store.bcscSecure.cardProcess as BCSCCardProcess } }
    case 'verify':
      return { name: BCSCScreens.VerificationMethodSelection }
    case 'transfer':
      return { name: BCSCScreens.TransferAccountInstructions }
    default:
      return { name: BCSCScreens.VerificationMethodSelection }
  }
}
