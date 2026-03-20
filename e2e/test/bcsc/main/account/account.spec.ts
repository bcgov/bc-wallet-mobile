import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const AccountE2EScreen = new BaseScreen()
const HomeE2EScreen = new BaseScreen()
const TabBarE2EScreen = new BaseScreen()
const WebViewE2EScreen = new BaseScreen()

const { Account, Home, TabBar, MainWebView } = TestIDs

describe('Account', () => {
  it('should navigate through the Home tab and tap the Account button', async () => {
    await HomeE2EScreen.waitForDisplayed(60_000, Home.SettingsMenuButton)
    await TabBarE2EScreen.tapByTestId(TabBar.Account)
  })

  it('should navigate through the Account screen and tap the My Devices button', async () => {
    await AccountE2EScreen.waitForDisplayed(60_000, Account.MyDevices)
    await AccountE2EScreen.tapByTestId(Account.MyDevices)
  })

  it('should navigate through the WebView screen and tap the Back button', async () => {
    await WebViewE2EScreen.waitForDisplayed(60_000, MainWebView.Back)
    await WebViewE2EScreen.tapByTestId(MainWebView.Back)
  })

  it('should navigate through the Account screen and go back home', async () => {
    await TabBarE2EScreen.waitForDisplayed(60_000, TabBar.Home)
    await TabBarE2EScreen.tapByTestId(TabBar.Home)
    await HomeE2EScreen.waitForDisplayed(60_000, Home.SettingsMenuButton)
  })
})
