import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'
import { getVerifyContext } from '../card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)

describe(`BCSC ${getVerifyContext().cardTypeLabel} Card`, () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    const { cardTypeButton } = getVerifyContext()
    await IdentitySelection.waitFor(cardTypeButton)
    await IdentitySelection.tap(cardTypeButton)
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructions.waitFor('EnterManually', 1_000)
    await SerialInstructions.tap('EnterManually')
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    const { testUser } = getVerifyContext()
    if (driver.isAndroid) {
      await ManualSerial.tap('SerialInput')
      await ManualSerial.type('SerialInput', testUser.cardSerial, { tapFirst: true })
    } else {
      await ManualSerial.tap('SerialPressable')
      await ManualSerial.type('SerialPressable', testUser.cardSerial, { tapFirst: true })
    }
    await ManualSerial.dismissKeyboard()
    await ManualSerial.tap('Continue')
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    const { testUser } = getVerifyContext()
    await EnterBirthdate.waitFor('Done', 1_000)
    if (driver.isAndroid) {
      await EnterBirthdate.tap('BirthdateInput')
      await EnterBirthdate.type('BirthdateInput', testUser.dob, { tapFirst: true })
    } else {
      await EnterBirthdate.tap('BirthdateInputPressable')
      await EnterBirthdate.type('BirthdateInputPressable', testUser.dob, { tapFirst: true })
    }
    await EnterBirthdate.dismissKeyboard()
    await EnterBirthdate.tap('Done')
  })
})
