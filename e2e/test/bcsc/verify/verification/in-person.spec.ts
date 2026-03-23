import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(TestIDs.VerificationMethodSelection)
const VerifyInPerson = new BaseScreen(TestIDs.VerifyInPerson)
const VerificationSuccess = new BaseScreen(TestIDs.VerificationSuccess)

describe('In-Person Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupSteps.waitFor('Step5', 10_000)
    await SetupSteps.tap('Step5')
  })

  it('should navigate through the Verification Method Selection screen and tap In Person', async () => {
    await VerificationMethodSelection.waitFor('InPerson')
    await VerificationMethodSelection.tap('InPerson')
  })

  it('should navigate through the Verify In Person screen and tap Complete', async () => {
    await VerifyInPerson.waitFor('Complete')

    // TEMPORARY manual verification for now until we can automate it
    await new Promise((resolve) => setTimeout(resolve, 25_000))
    await VerifyInPerson.tap('Complete')
    await VerificationSuccess.waitFor('Ok')
    await VerificationSuccess.tap('Ok')
  })
})
