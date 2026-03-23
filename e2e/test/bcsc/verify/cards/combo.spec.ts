import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)

const cardSerial = process.env.CARD_SERIAL || 'XXXXXX'
const birthDate = process.env.BIRTH_DATE || 'YYYY/MM/DD'

describe('BCSC Combined Card', () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and tap Combined Card', async () => {
    await IdentitySelection.waitFor('CombinedCard')
    await IdentitySelection.tap('CombinedCard')
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructions.waitFor('EnterManually', 10_000)
    await SerialInstructions.tap('EnterManually')
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    await ManualSerial.waitFor('SerialInput')
    await ManualSerial.type('SerialInput', cardSerial)
    await ManualSerial.dismissKeyboard()
    await ManualSerial.tap('Continue')
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    await EnterBirthdate.waitFor('Done', 10_000)
    await EnterBirthdate.tap('BirthdateInputPressable')
    await EnterBirthdate.type('BirthdateInputPressable', birthDate)
    await EnterBirthdate.dismissKeyboard()
    await EnterBirthdate.tap('Done')
  })
})
