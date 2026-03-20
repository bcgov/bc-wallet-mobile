import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const TabBarE2EScreen = new BaseScreen()
const HomeE2EScreen = new BaseScreen()
const ServicesE2EScreen = new BaseScreen()
const AccountE2EScreen = new BaseScreen()

const { TabBar, Home, Services, Account } = TestIDs

describe('Tab Navigation', () => {
  it('should navigate through the Home tab and to the Services tab', async () => {
    await TabBarE2EScreen.waitForDisplayed(60_000, TabBar.Home)
    await HomeE2EScreen.waitForDisplayed(60_000, Home.SettingsMenuButton)
    await TabBarE2EScreen.tapByTestId(TabBar.Services)
  })

  it('should navigate through the Services tab and to the Account tab', async () => {
    await ServicesE2EScreen.waitForDisplayed(60_000, Services.Search)
    await TabBarE2EScreen.tapByTestId(TabBar.Account)
  })

  it('should navigate through the Account tab and to the Home tab', async () => {
    await AccountE2EScreen.waitForDisplayed(60_000, Account.AccountScreen)
    await TabBarE2EScreen.tapByTestId(TabBar.Home)
  })
})
