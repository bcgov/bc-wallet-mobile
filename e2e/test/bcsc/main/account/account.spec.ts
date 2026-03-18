import { AccountE2EScreen, TabBarE2EScreen, WebViewE2EScreen } from '../../../../src/screens/bcsc/main/index.js'

describe('Account', () => {
  it('should open Account from the Home tab', async () => {
    await TabBarE2EScreen.tapAccount()
    await AccountE2EScreen.waitForDisplayed()
  })

  it('should navigate to My Devices', async () => {
    await AccountE2EScreen.tapMyDevices()
    await WebViewE2EScreen.waitForDisplayed()
  })

  it('should go back to Account', async () => {
    await WebViewE2EScreen.tapBack()
    await AccountE2EScreen.waitForDisplayed()
  })
})
