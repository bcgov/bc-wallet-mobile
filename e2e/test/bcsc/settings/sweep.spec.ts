/**
 * Settings interaction sweep — starts on the Home tab, opens the Settings menu
 * via the hamburger header button, and stops.
 *
 * Pre-condition: the user is verified and resting on the Home tab.
 */
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)

describe('Settings', () => {
  it('opens the Settings menu from the Home tab', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
  })
})
