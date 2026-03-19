import {
  AutoLockE2EScreen,
  HomeE2EScreen,
  SettingsE2EScreen,
  TabBarE2EScreen,
} from '../../../../src/screens/bcsc/main/index.js'

describe('Settings', () => {
  it('should navigate through the Home tab and tap the Settings button', async () => {
    await HomeE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapSettings()
  })

  it('should navigate through the Settings screen and tap the Auto Lock button', async () => {
    await SettingsE2EScreen.waitForDisplayed()
    await SettingsE2EScreen.tapAutoLock()
  })

  it('should navigate through the Auto Lock screen and tap the 3 minutes option', async () => {
    await AutoLockE2EScreen.waitForDisplayed()
    await AutoLockE2EScreen.tapTime3Minutes()
    await AutoLockE2EScreen.tapBack()
  })

  // TODO: Add tests for Sign Out
  // TODO: Add tests for App Security settings
  // TODO: Add tests for Change PIN settings
  // TODO: Add tests for Edit Nickname settings
  // TODO: Add tests for Forget Pairings settings
  // TODO: Add tests for Analytics Opt In settings
  // TODO: Add tests for Remove Account settings
  // TODO: Add tests for Help settings
  // TODO: Add tests for Privacy settings
  // TODO: Add tests for Contact Us settings
  // TODO: Add tests for Feedback settings
  // TODO: Add tests for Accessibility settings
  // TODO: Add tests for Terms of Use settings
  // TODO: Add tests for Analytics settings
  // TODO: Add tests for Developer Mode settings

  it('should navigate through the Settings screen and tap the Back button', async () => {
    await SettingsE2EScreen.waitForDisplayed()
    await SettingsE2EScreen.tapBack()
    await TabBarE2EScreen.waitForDisplayed()
  })
})
