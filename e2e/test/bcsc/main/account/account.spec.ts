import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const Account = new BaseScreen(BCSC_TestIDs.Account)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

describe('Account', () => {
  it('should navigate through the Home tab and tap the Account button', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('Account')
  })

  it('should navigate through the Account screen and tap the My Devices button', async () => {
    await Account.waitFor('MyDevices')
    await Account.tap('MyDevices')
  })

  it('should navigate through the WebView screen and tap the Back button', async () => {
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('should navigate through the Account screen and go back home', async () => {
    await TabBar.waitFor('Home')
    await TabBar.tap('Home')
    await Home.waitFor('SettingsMenuButton')
  })
})
