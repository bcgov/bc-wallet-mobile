import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Services = new BaseScreen(BCSC_TestIDs.Services)
const Account = new BaseScreen(BCSC_TestIDs.Account)
const AutoLock = new BaseScreen(BCSC_TestIDs.AutoLock)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

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

describe('Settings', () => {
  it('should navigate through the Home tab and tap the Settings button', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('SettingsMenuButton')
  })

  it('should navigate through the Settings screen and tap the Auto Lock button', async () => {
    await Settings.waitFor('AutoLock')
    await Settings.tap('AutoLock')
  })

  it('should navigate through the Auto Lock screen and tap the 3 minutes option', async () => {
    await AutoLock.waitFor('AutoLockTime3')
    await AutoLock.tap('AutoLockTime3')
    await AutoLock.tap('BackButton')
  })

  // Add tests for Sign Out
  // Add tests for App Security settings
  // Add tests for Change PIN settings
  // Add tests for Edit Nickname settings
  // Add tests for Forget Pairings settings
  // Add tests for Analytics Opt In settings
  // Add tests for Remove Account settings
  // Add tests for Help settings
  // Add tests for Privacy settings
  // Add tests for Contact Us settings
  // Add tests for Feedback settings
  // Add tests for Accessibility settings
  // Add tests for Terms of Use settings
  // Add tests for Analytics settings
  // Add tests for Developer Mode settings

  it('should navigate through the Settings screen and tap the Back button', async () => {
    await Settings.waitFor('BackButton')
    await Settings.tap('BackButton')
    await TabBar.waitFor('Home')
  })
})

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
