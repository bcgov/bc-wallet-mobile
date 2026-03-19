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

  // Add tests for Sign Out
  // Add tests for App Security settings
  // Add tests for Change PIN settings
  // Add tests for Edit Nickname settings
  // Add tests for Forget Pairings settings
  // Add tests for Analytics Opt In settings
  // Add tests for Remove Account settings
  // Add tests for Help settings
  // Add tests for Privacy settings
  // Add tests for Contact Us settings
  // Add tests for Feedback settings
  // Add tests for Accessibility settings
  // Add tests for Terms of Use settings
  // Add tests for Analytics settings
  // Add tests for Developer Mode settings

  it('should navigate through the Settings screen and tap the Back button', async () => {
    await SettingsE2EScreen.waitForDisplayed()
    await SettingsE2EScreen.tapBack()
    await TabBarE2EScreen.waitForDisplayed()
  })
})
