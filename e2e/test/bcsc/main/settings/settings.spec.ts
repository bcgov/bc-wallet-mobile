import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const AutoLockE2EScreen = new BaseScreen()
const HomeE2EScreen = new BaseScreen()
const SettingsE2EScreen = new BaseScreen()
const TabBarE2EScreen = new BaseScreen()

const { AutoLock, Home, Settings, TabBar } = TestIDs

describe('Settings', () => {
  it('should navigate through the Home tab and tap the Settings button', async () => {
    await HomeE2EScreen.waitForDisplayed(60_000, Home.SettingsMenuButton)
    await TabBarE2EScreen.tapByTestId(TabBar.SettingsMenuButton)
  })

  it('should navigate through the Settings screen and tap the Auto Lock button', async () => {
    await SettingsE2EScreen.waitForDisplayed(60_000, Settings.AutoLock)
    await SettingsE2EScreen.tapByTestId(Settings.AutoLock)
  })

  it('should navigate through the Auto Lock screen and tap the 3 minutes option', async () => {
    await AutoLockE2EScreen.waitForDisplayed(60_000, AutoLock.AutoLockTime3)
    await AutoLockE2EScreen.tapByTestId(AutoLock.AutoLockTime3)
    await AutoLockE2EScreen.tapByTestId(AutoLock.BackButton)
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
    await SettingsE2EScreen.waitForDisplayed(60_000, Settings.BackButton)
    await SettingsE2EScreen.tapByTestId(Settings.BackButton)
    await TabBarE2EScreen.waitForDisplayed(60_000, TabBar.Home)
  })
})
