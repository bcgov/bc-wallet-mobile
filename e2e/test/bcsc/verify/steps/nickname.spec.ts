import {
  IdentitySelectionE2EScreen,
  NicknameE2EScreen,
  SetupStepsE2EScreen,
} from '../../../../src/screens/bcsc/verify/index.js'

describe('Nickname', () => {
  it('should display the Setup Steps screen', async () => {
    await SetupStepsE2EScreen.waitForDisplayed(60_000)
  })

  it('should navigate to the Nickname screen', async () => {
    await SetupStepsE2EScreen.tapStep1()
    await NicknameE2EScreen.waitForDisplayed(60_000)
  })

  it('should fill in the Nickname', async () => {
    await NicknameE2EScreen.enterName('John Doe')
    await NicknameE2EScreen.tapSaveAndContinue()
  })

  it('should navigate to the Identity screen', async () => {
    await SetupStepsE2EScreen.tapStep2()
    await IdentitySelectionE2EScreen.waitForDisplayed(60_000)
  })
})
