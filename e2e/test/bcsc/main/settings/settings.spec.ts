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

  it('should toggle auto-lock and select 5 minutes', async () => {
    await AutoLockE2EScreen.tapToggleAutoLock()
    await AutoLockE2EScreen.tapTime5Minutes()
  })
})
