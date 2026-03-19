import { NicknameE2EScreen, SetupStepsE2EScreen } from '../../../../src/screens/bcsc/verify/index.js'

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000)
    await SetupStepsE2EScreen.tapStep1()
  })

  it('should fill in the Nickname', async () => {
    await NicknameE2EScreen.waitForDisplayed(60_000)
    await NicknameE2EScreen.enterName('John Doe')
    await NicknameE2EScreen.tapSaveAndContinue()
  })
})
