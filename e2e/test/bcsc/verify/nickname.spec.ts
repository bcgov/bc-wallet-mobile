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
    await Nickname.waitFor('AccountNicknamePressable')
    await Nickname.type('AccountNicknamePressable', testUser.username)
    await Nickname.tap('SaveAndContinue')
  })
})
