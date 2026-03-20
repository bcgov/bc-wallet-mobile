import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const SetupStepsE2EScreen = new BaseScreen()
const IdentitySelectionE2EScreen = new BaseScreen()
const SerialInstructionsE2EScreen = new BaseScreen()
const ManualSerialE2EScreen = new BaseScreen()
const EnterBirthdateE2EScreen = new BaseScreen()

const { SetupSteps, IdentitySelection, SerialInstructions, ManualSerial, EnterBirthdate } = TestIDs

const cardSerial = process.env.CARD_SERIAL || 'XXXXXX'
const birthDate = process.env.BIRTH_DATE || 'YYYY/MM/DD'

describe('BCSC Combined Card', () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000, SetupSteps.Step2)
    await SetupStepsE2EScreen.tapByTestId(SetupSteps.Step2)
  })

  it('should navigate through the Identity screen and tap Combined Card', async () => {
    await IdentitySelectionE2EScreen.waitForDisplayed(60_000, IdentitySelection.CombinedCard)
    await IdentitySelectionE2EScreen.tapByTestId(IdentitySelection.CombinedCard)
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructionsE2EScreen.waitForDisplayed(10_000, SerialInstructions.EnterManually)
    await SerialInstructionsE2EScreen.tapByTestId(SerialInstructions.EnterManually)
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    await ManualSerialE2EScreen.waitForDisplayed(60_000, ManualSerial.SerialInput)
    await ManualSerialE2EScreen.enterText(ManualSerial.SerialInput, cardSerial)
    await ManualSerialE2EScreen.dismissKeyboard()
    await ManualSerialE2EScreen.tapByTestId(ManualSerial.Continue)
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    await EnterBirthdateE2EScreen.waitForDisplayed(10_000, EnterBirthdate.Done)
    await EnterBirthdateE2EScreen.tapByTestId(EnterBirthdate.BirthdateInputPressable)
    await EnterBirthdateE2EScreen.enterText(EnterBirthdate.BirthdateInputPressable, birthDate)
    await EnterBirthdateE2EScreen.dismissKeyboard()
    await EnterBirthdateE2EScreen.tapByTestId(EnterBirthdate.Done)
  })
})
