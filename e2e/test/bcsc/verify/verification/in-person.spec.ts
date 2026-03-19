import {
  SetupStepsE2EScreen,
  VerificationMethodSelectionE2EScreen,
  VerificationSuccessE2EScreen,
  VerifyInPersonE2EScreen,
} from '../../../../src/screens/bcsc/verify/index.js'

describe('In-Person Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000)
    await SetupStepsE2EScreen.tapStep5()
  })

  it('should navigate through the Verification Method Selection screen and tap In Person', async () => {
    await VerificationMethodSelectionE2EScreen.waitForDisplayed(60_000)
    await VerificationMethodSelectionE2EScreen.tapInPerson()
  })

  it('should navigate through the Verify In Person screen and tap Complete', async () => {
    await VerifyInPersonE2EScreen.waitForDisplayed(60_000)

    // TEMPORARY manual verification for now until we can automate it
    await new Promise((resolve) => setTimeout(resolve, 100_000))
    await VerifyInPersonE2EScreen.tapComplete()
    await VerificationSuccessE2EScreen.waitForDisplayed(60_000)
    await VerificationSuccessE2EScreen.tapOk()
  })
})
