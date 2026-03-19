import {
  AccountE2EScreen,
  HomeE2EScreen,
  ServicesE2EScreen,
  TabBarE2EScreen,
} from '../../../../src/screens/bcsc/main/index.js'

describe('Tab Navigation', () => {
  it('should navigate through the Home tab and to the Services tab', async () => {
    await TabBarE2EScreen.waitForDisplayed(60_000)
    await HomeE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapServices()
  })

  it('should navigate through the Services tab and to the Account tab', async () => {
    await ServicesE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapAccount()
  })

  it('should navigate through the Account tab and to the Home tab', async () => {
    await AccountE2EScreen.waitForDisplayed()
    await TabBarE2EScreen.tapHome()
  })
})
