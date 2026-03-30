import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { getVerifyContext } from './card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const Nickname = new BaseScreen(BCSC_TestIDs.Nickname)

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupSteps.waitFor('Step1')
    await SetupSteps.tap('Step1')
  })

  it('should fill in the Nickname', async () => {
    const { testUser } = getVerifyContext()
    if (driver.isAndroid) {
      await Nickname.tap('AccountNicknameInput')
      await Nickname.type('AccountNicknameInput', testUser.username, { tapFirst: true, characterByCharacter: false })
    } else {
      await Nickname.tap('AccountNicknamePressable')
      await Nickname.type('AccountNicknamePressable', testUser.username, { tapFirst: true })
    }
    await Nickname.tap('SaveAndContinue')
  })
})
