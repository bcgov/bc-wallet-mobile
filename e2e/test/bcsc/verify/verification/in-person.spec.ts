import {
  SetupStepsE2EScreen,
  VerificationMethodSelectionE2EScreen,
  VerificationSuccessE2EScreen,
  VerifyInPersonE2EScreen,
} from '../../../../src/screens/bcsc/verify/index.js'

describe('In-Person Verification', () => {
  it('should select the Identity Verification screen', async () => {
    await SetupStepsE2EScreen.tapStep5()
    await VerificationMethodSelectionE2EScreen.waitForDisplayed(60_000)
  })

  it('should select the in-person verification method', async () => {
    await VerificationMethodSelectionE2EScreen.tapInPerson()
    await VerifyInPersonE2EScreen.waitForDisplayed(60_000)
  })

  it('should complete the in-person verification', async () => {
    // TEMPORARY manual verification for now until we can automate it
    await new Promise((resolve) => setTimeout(resolve, 100_000))
    await VerifyInPersonE2EScreen.tapComplete()
    await VerificationSuccessE2EScreen.waitForDisplayed(60_000)
    await VerificationSuccessE2EScreen.tapOk()
  })
})
