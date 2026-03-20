import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const NicknameE2EScreen = new BaseScreen()
const SetupStepsE2EScreen = new BaseScreen()

const { Nickname, SetupSteps } = TestIDs

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000, SetupSteps.Step1)
    await SetupStepsE2EScreen.tapByTestId(SetupSteps.Step1)
  })

  it('should fill in the Nickname', async () => {
    await NicknameE2EScreen.waitForDisplayed(60_000, Nickname.NameInput)
    await NicknameE2EScreen.enterText(Nickname.NameInput, 'John Doe')
    await NicknameE2EScreen.tapByTestId(Nickname.SaveAndContinue)
  })
})
