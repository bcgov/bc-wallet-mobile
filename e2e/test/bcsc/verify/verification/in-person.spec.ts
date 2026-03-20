import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const SetupStepsE2EScreen = new BaseScreen()
const VerificationMethodSelectionE2EScreen = new BaseScreen()
const VerifyInPersonE2EScreen = new BaseScreen()
const VerificationSuccessE2EScreen = new BaseScreen()

const { SetupSteps, VerificationMethodSelection, VerifyInPerson, VerificationSuccess } = TestIDs

describe('In-Person Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000, SetupSteps.Step5)
    await SetupStepsE2EScreen.tapByTestId(SetupSteps.Step5)
  })

  it('should navigate through the Verification Method Selection screen and tap In Person', async () => {
    await VerificationMethodSelectionE2EScreen.waitForDisplayed(60_000, VerificationMethodSelection.InPerson)
    await VerificationMethodSelectionE2EScreen.tapByTestId(VerificationMethodSelection.InPerson)
  })

  it('should navigate through the Verify In Person screen and tap Complete', async () => {
    await VerifyInPersonE2EScreen.waitForDisplayed(60_000, VerifyInPerson.Complete)

    // TEMPORARY manual verification for now until we can automate it
    await new Promise((resolve) => setTimeout(resolve, 100_000))
    await VerifyInPersonE2EScreen.tapByTestId(VerifyInPerson.Complete)
    await VerificationSuccessE2EScreen.waitForDisplayed(60_000, VerificationSuccess.Ok)
    await VerificationSuccessE2EScreen.tapByTestId(VerificationSuccess.Ok)
  })
})
