import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { isUserVerified } from './bcsc-credential'
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

  switch (completion.currentStep) {
    case 'id':
      if (completion.id.nonBcscNeedsAdditionalCard) {
        return { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.NonBCSC } }
      }
      if (completion.id.nonPhotoBcscNeedsAdditionalCard) {
        return { name: BCSCScreens.AdditionalIdentificationRequired }
      }
      return { name: BCSCScreens.IdentitySelection }
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
