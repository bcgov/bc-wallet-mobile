import {
  AccountE2EScreen,
  HomeE2EScreen,
  TabBarE2EScreen,
  WebViewE2EScreen,
} from '../../../../src/screens/bcsc/main/index.js'

describe('Account', () => {
  it('should navigate through the Home tab and tap the Account button', async () => {
    await HomeE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapAccount()
  })

  it('should navigate through the Account screen and tap the My Devices button', async () => {
    await AccountE2EScreen.waitForDisplayed()
    await AccountE2EScreen.tapMyDevices()
  })

  it('should navigate through the WebView screen and tap the Back button', async () => {
    await WebViewE2EScreen.waitForDisplayed()
    await WebViewE2EScreen.tapBack()
  })

  it('should navigate through the Account screen and go back home', async () => {
    await TabBarE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapHome()
    await HomeE2EScreen.waitForDisplayed()
  })
})
