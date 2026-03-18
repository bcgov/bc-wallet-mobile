import {
  EnterBirthdateE2EScreen,
  IdentitySelectionE2EScreen,
  ManualSerialE2EScreen,
  SerialInstructionsE2EScreen,
  SetupStepsE2EScreen,
} from '../../../../src/screens/bcsc/verify/index.js'

describe('BCSC Combined Card', () => {
  it('should select the BCSC card and navigate to the Serial Instructions screen', async () => {
    await IdentitySelectionE2EScreen.tapCombinedCard()
    await SerialInstructionsE2EScreen.waitForDisplayed(60_000)
  })

  it('should select the Manual Serial Instructions screen', async () => {
    await SerialInstructionsE2EScreen.tapEnterManually()
    await ManualSerialE2EScreen.waitForDisplayed(60_000)
  })

  it('should fill in the Serial', async () => {
    await ManualSerialE2EScreen.enterSerial('C22014083')
    await ManualSerialE2EScreen.dismissKeyboard()
    await ManualSerialE2EScreen.tapContinue()
  })

  it('should navigate to the Enter Birthdate screen', async () => {
    await EnterBirthdateE2EScreen.waitForDisplayed(60_000)
    await EnterBirthdateE2EScreen.enterBirthdate('1984/09/13')
    await EnterBirthdateE2EScreen.dismissKeyboard()
    await EnterBirthdateE2EScreen.tapDone()
  })

  it('should navigate back to the Setup Steps screen', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000)
  })
})
