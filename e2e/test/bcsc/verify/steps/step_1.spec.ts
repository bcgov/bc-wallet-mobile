import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const Nickname = new BaseScreen(BCSC_TestIDs.Nickname)
const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupSteps.waitFor('Step1')
    await SetupSteps.tap('Step1')
  })

  it('should fill in the Nickname', async () => {
    await Nickname.waitFor('AccountNicknamePressable')
    await Nickname.type('AccountNicknamePressable', 'John Doe')
    await Nickname.tap('SaveAndContinue')
  })
})
