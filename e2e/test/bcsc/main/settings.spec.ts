import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const AutoLock = new BaseScreen(BCSC_TestIDs.AutoLock)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)

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

  it('should navigate through the Settings screen and tap the Back button', async () => {
    await Settings.waitFor('BackButton')
    await Settings.tap('BackButton')
    await TabBar.waitFor('Home')
  })
})
