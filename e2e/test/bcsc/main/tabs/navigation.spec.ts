import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../../src/testIDs.js'

const TabBar = new BaseScreen(TestIDs.TabBar)
const Home = new BaseScreen(TestIDs.Home)
const Services = new BaseScreen(TestIDs.Services)
const Account = new BaseScreen(TestIDs.Account)

describe('Tab Navigation', () => {
  it('should navigate through the Home tab and to the Services tab', async () => {
    await TabBar.waitFor('Home')
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('Services')
  })

  it('should navigate through the Services tab and to the Account tab', async () => {
    await Services.waitFor('Search')
    await TabBar.tap('Account')
  })

  it('should navigate through the Account tab and to the Home tab', async () => {
    await Account.waitFor('AccountScreen')
    await TabBar.tap('Home')
  })
})
