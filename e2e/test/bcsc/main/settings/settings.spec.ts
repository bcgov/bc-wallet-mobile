import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const AutoLock = new BaseScreen(TestIDs.AutoLock)
const Home = new BaseScreen(TestIDs.Home)
const Settings = new BaseScreen(TestIDs.Settings)
const TabBar = new BaseScreen(TestIDs.TabBar)

describe('Settings', () => {
  it('should navigate through the Home tab and tap the Settings button', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('SettingsMenuButton')
  })

  it('should navigate through the Settings screen and tap the Auto Lock button', async () => {
    await Settings.waitFor('AutoLock')
    await Settings.tap('AutoLock')
  })

  it('should navigate through the Auto Lock screen and tap the 3 minutes option', async () => {
    await AutoLock.waitFor('AutoLockTime3')
    await AutoLock.tap('AutoLockTime3')
    await AutoLock.tap('BackButton')
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
    await Settings.waitFor('BackButton')
    await Settings.tap('BackButton')
    await TabBar.waitFor('Home')
  })
})
