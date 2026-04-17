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

  it('should fill out the email address', async () => {
    tempEmail = await getTempEmailAddress()

    await EmailAddress.type('EmailInput', tempEmail.email)
    await EmailAddress.tap('ContinueButton')
  })

  it('should get the email confirmation code and enter it into the input field', async () => {
    const code = await getEmailConfirmationCode(tempEmail.token)

    await EmailConfirmation.tap('CodeInput')
    await EmailConfirmation.type('CodeInput', code)

    await EmailConfirmation.tap('ContinueButton')
  })
})
