import { AutoLockE2EScreen, SettingsE2EScreen, TabBarE2EScreen } from '../../../../src/screens/bcsc/main/index.js'

describe('Settings', () => {
  it('should open Settings from the Home tab', async () => {
    await TabBarE2EScreen.tapSettings()
    await SettingsE2EScreen.waitForDisplayed()
  })

  it('should navigate to Auto Lock settings', async () => {
    await SettingsE2EScreen.tapAutoLock()
    await AutoLockE2EScreen.waitForDisplayed()
  })

  it('should select 3 minutes and go back', async () => {
    await AutoLockE2EScreen.tapTime3Minutes()
    await AutoLockE2EScreen.tapBack()
    await SettingsE2EScreen.waitForDisplayed()
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

  it('should leave Settings and go back to Home', async () => {
    await SettingsE2EScreen.tapBack()
    await TabBarE2EScreen.waitForDisplayed()
  })
})
