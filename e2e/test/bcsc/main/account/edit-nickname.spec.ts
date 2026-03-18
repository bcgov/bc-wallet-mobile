import { EditNicknameE2EScreen, SettingsE2EScreen, TabBarE2EScreen } from '../../../../src/screens/bcsc/main/index.js'

describe('Edit Nickname', () => {
  it('should open Settings', async () => {
    await TabBarE2EScreen.tapSettings()
    await SettingsE2EScreen.waitForDisplayed()
  })

  it('should navigate to Edit Nickname', async () => {
    await SettingsE2EScreen.tapEditNickname()
    await EditNicknameE2EScreen.waitForDisplayed()
  })

  it('should update the nickname', async () => {
    await EditNicknameE2EScreen.enterName('Test User')
    await EditNicknameE2EScreen.tapSaveAndContinue()
  })
})
