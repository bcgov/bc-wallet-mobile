import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, initialState } from '@/store'
import { getResumeStepRoute } from './resume-step-route'

describe('getResumeStepRoute', () => {
  it('routes to the account-setup question when the setup type has not been chosen yet', () => {
    const store = structuredClone(initialState)
    // No accountSetupType, not verified, no video submitted → ask how to set up first.
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.AccountSetup)
  })

  it('routes a transfer user to the QR transfer instructions, skipping verification steps', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.TransferAccount
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.TransferAccountInstructions)
  })

  it('routes a new-account user to identity selection', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.IdentitySelection)
  })

  it('routes a verified user to the success screen regardless of setup type', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.TransferAccount
    store.bcscSecure.verified = true
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.VerificationSuccess)
  })
})
