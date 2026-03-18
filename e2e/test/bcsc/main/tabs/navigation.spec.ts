import { HomeE2EScreen, ServicesE2EScreen, TabBarE2EScreen } from '../../../../src/screens/bcsc/main/index.js'

describe('Tab Navigation', () => {
  it('should display the Tab Bar after verification', async () => {
    await TabBarE2EScreen.waitForDisplayed(60_000)
  })

  it('should display the Home screen', async () => {
    await HomeE2EScreen.waitForDisplayed()
  })

  it('should navigate to the Services tab', async () => {
    await TabBarE2EScreen.tapServices()
    await ServicesE2EScreen.waitForDisplayed()
  })

  it('should navigate to the Account tab', async () => {
    await TabBarE2EScreen.tapAccount()
  })

  it('should navigate back to the Home tab', async () => {
    await TabBarE2EScreen.tapHome()
    await HomeE2EScreen.waitForDisplayed()
  })
})
