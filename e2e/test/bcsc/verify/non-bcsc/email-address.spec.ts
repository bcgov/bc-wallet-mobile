import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const EmailAddress = new BaseScreen(BCSC_TestIDs.EnterEmail)

describe('Email Address', () => {
  it('should navigate to the email address form', async () => {
    await SetupSteps.tap('Step4')
  })

  it('should fill out the email address input', async () => {})
})
