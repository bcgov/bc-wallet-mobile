import {
  EnterBirthdateE2EScreen,
  IdentitySelectionE2EScreen,
  ManualSerialE2EScreen,
  SerialInstructionsE2EScreen,
  SetupStepsE2EScreen,
} from '../../../../src/screens/bcsc/verify/index.js'

const cardSerial = process.env.CARD_SERIAL || 'XXXXXX'
const birthDate = process.env.BIRTH_DATE || 'YYYY/MM/DD'

describe('BCSC Combined Card', () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000)
    await SetupStepsE2EScreen.tapStep2()
  })

  it('should navigate through the Identity screen and tap Combined Card', async () => {
    await IdentitySelectionE2EScreen.waitForDisplayed(60_000)
    await IdentitySelectionE2EScreen.tapCombinedCard()
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructionsE2EScreen.waitForDisplayed(60_000)
    await SerialInstructionsE2EScreen.tapEnterManually()
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    await ManualSerialE2EScreen.waitForDisplayed(60_000)
    await ManualSerialE2EScreen.enterSerial(cardSerial)
    await ManualSerialE2EScreen.tapContinue()
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    await EnterBirthdateE2EScreen.waitForDisplayed(60_000)
    await EnterBirthdateE2EScreen.enterBirthdate(birthDate)
    await EnterBirthdateE2EScreen.tapDone()
  })
})
