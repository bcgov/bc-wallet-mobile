import { TestUsers, verifyContext } from '../../../src/constants.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const testUser = TestUsers.basic
verifyContext.testUser = testUser

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const Nickname = new BaseScreen(BCSC_TestIDs.Nickname)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupSteps.waitFor('Step1')
    await SetupSteps.tap('Step1')
  })

  it('should fill in the Nickname', async () => {
    await Nickname.waitFor('AccountNicknamePressable')
    await Nickname.type('AccountNicknamePressable', testUser.username)
    await Nickname.tap('SaveAndContinue')
  })
})

describe('BCSC Combined Card', () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    await IdentitySelection.waitFor('CombinedCard')
    await IdentitySelection.tap('CombinedCard')
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructions.waitFor('EnterManually', 10_000)
    await SerialInstructions.tap('EnterManually')
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    await ManualSerial.waitFor('SerialPressable')
    await ManualSerial.type('SerialPressable', testUser.cardSerial)
    await ManualSerial.dismissKeyboard()
    await ManualSerial.tap('Continue')
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    await EnterBirthdate.waitFor('Done', 10_000)
    await EnterBirthdate.tap('BirthdateInputPressable')
    await EnterBirthdate.type('BirthdateInputPressable', testUser.dob)
    await EnterBirthdate.dismissKeyboard()
    await EnterBirthdate.tap('Done')
  })
})
