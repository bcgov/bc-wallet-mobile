import { getEmailConfirmationCode, getTempEmailAddress } from '../../../../src/helpers/email.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const EmailAddress = new BaseScreen(BCSC_TestIDs.EnterEmail)
const EmailConfirmation = new BaseScreen(BCSC_TestIDs.EmailConfirmation)

let tempEmail: { email: string; token: string }

describe('Email Address', () => {
  it('should navigate to the email address form', async () => {
    await SetupSteps.tap('Step4')
  })

  it('should input the email address', async () => {
    tempEmail = await getTempEmailAddress()

    await EmailAddress.type('EmailInput', tempEmail.email)
    await EmailAddress.tap('ContinueButton')
  })

  it('should input the email confirmation code', async () => {
    const code = await getEmailConfirmationCode(tempEmail.token)

    await EmailConfirmation.type('CodeInput', code)
    await EmailConfirmation.tap('ContinueButton')
  })

  it('should render the email address in Setup Step 4', async () => {
    // The email address is generated on the fly, so the test ID is dynamic.
    // After confirmation, the app returns to Setup Steps and displays the confirmed email on Step 4.
    const el = await SetupSteps.findByTestId(`com.ariesbifold:id/${tempEmail.email}`)
    await el.isDisplayed()
  })
})
