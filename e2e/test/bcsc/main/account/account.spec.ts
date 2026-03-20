import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const Account = new BaseScreen(TestIDs.Account)
const Home = new BaseScreen(TestIDs.Home)
const TabBar = new BaseScreen(TestIDs.TabBar)
const MainWebView = new BaseScreen(TestIDs.MainWebView)

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
    await MainWebView.waitFor('Back')
    await MainWebView.tap('Back')
  })

  it('should navigate through the Account screen and go back home', async () => {
    await TabBar.waitFor('Home')
    await TabBar.tap('Home')
    await Home.waitFor('SettingsMenuButton')
  })
})
