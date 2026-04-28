/**
 * Main Interaction Sweep — exercises remaining main-stack interactions
 * (Home, Services search + service detail, Account) not covered by the
 * other main specs (tab nav, settings, pairing, transferer).
 *
 * Pre: verified, resting on Home. Post: back on Home.
 */
import { Timeouts } from '../../../src/constants.js'
import { getCurrentAppId } from '../../../src/helpers/deep-link.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const Account = new BaseScreen(BCSC_TestIDs.Account)
const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Services = new BaseScreen(BCSC_TestIDs.Services)
const ServiceLogin = new BaseScreen(BCSC_TestIDs.ServiceLogin)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

const SEARCH_QUERY = 'first'

const SERVICES_TO_EXERCISE = 5

function serviceButtonSelector(): string {
  return driver.isIOS
    ? '-ios predicate string:name BEGINSWITH "com.ariesbifold:id/ServiceButton-"'
    : 'android=new UiSelector().resourceIdMatches(".*ServiceButton-.*")'
}

describe('Home → secondary interactions', () => {
  before(async () => {
    await Home.waitFor('SettingsMenuButton', Timeouts.SCREEN_TRANSITION)
  })

  it('opens the Home Help WebView and returns Home', async () => {
    await Home.waitFor('Help')
    await Home.tap('Help')
    await WebView.waitFor('Back', Timeouts.SCREEN_TRANSITION)
    await WebView.tap('Back')
    await Home.waitFor('SettingsMenuButton')
  })

  it('routes Where To Use to the Services tab and returns Home', async () => {
    await Home.waitFor('WhereToUse')
    await Home.tap('WhereToUse')
    await Services.waitFor('Search', Timeouts.SCREEN_TRANSITION)
  })
})

describe('Services → search and clear', () => {
  it('types a query and verifies the clear button appears', async () => {
    await Services.type('Search', SEARCH_QUERY, { tapFirst: true })
    await Services.dismissKeyboard()
    await Services.waitFor('ClearSearch', Timeouts.SCREEN_TRANSITION)
  })

  it('clears the query and verifies the clear button disappears', async () => {
    await Services.tap('ClearSearch')
    await driver.waitUntil(async () => !(await Services.isDisplayed('ClearSearch')), {
      timeout: Timeouts.SCREEN_TRANSITION,
      timeoutMsg: 'Expected ClearSearch button to disappear after clearing search',
    })
  })
})

describe('Services → service detail interactions', () => {
  it('opens the first service and exercises every safe ServiceLoginScreen button', async () => {
    const services = await $$(serviceButtonSelector()).getElements()

    if (!services.length) {
      throw new Error('No ServiceButtons rendered in the Services catalogue')
    }

    await services[2].waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await services[2].click()

    await ServiceLogin.waitFor('ServiceLoginCancel', Timeouts.SCREEN_TRANSITION)
    const continueButton = await ServiceLogin.findByTestId(ServiceLogin.ids.ServiceLoginContinue)
    await continueButton.waitForDisplayed({ timeout: Timeouts.ELEMENT_VISIBLE })

    if (await continueButton.isEnabled()) {
      const appIdForPrivacy = await getCurrentAppId()
      await ServiceLogin.tap('ServiceLoginContinue')
      await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
      await driver.activateApp(appIdForPrivacy)
    }
  })

  it('opens the service Help WebView and returns to the service detail', async () => {
    await Home.waitFor('SettingsMenuButton', Timeouts.SCREEN_TRANSITION)
    await TabBar.waitFor('Services')
    await TabBar.tap('Services')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)

    const services = await $$(serviceButtonSelector()).getElements()

    if (!services.length) {
      throw new Error('No ServiceButtons rendered in the Services catalogue')
    }

    await services[2].waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await services[2].click()

    await ServiceLogin.tap('HelpButton')

    await WebView.waitFor('Back', Timeouts.SCREEN_TRANSITION)
    await WebView.tap('Back')

    await ServiceLogin.waitFor('ServiceLoginCancel')

    if (await ServiceLogin.isDisplayed('ReadPrivacyPolicy')) {
      const appIdForPrivacy = await getCurrentAppId()
      await ServiceLogin.tap('ReadPrivacyPolicy')
      await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
      await driver.activateApp(appIdForPrivacy)
      await ServiceLogin.waitFor('ServiceLoginCancel', Timeouts.SCREEN_TRANSITION)
    }
  })

  it('opens Report Suspicious Link in the system browser and returns to the service detail', async () => {
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)

    const appIdForReport = await getCurrentAppId()

    await ServiceLogin.waitFor('ReportSuspiciousLink', Timeouts.ELEMENT_VISIBLE)
    await ServiceLogin.tap('ReportSuspiciousLink')

    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appIdForReport)

    await ServiceLogin.waitFor('ServiceLoginCancel', Timeouts.SCREEN_TRANSITION)

    await ServiceLogin.tap('ServiceLoginCancel')
    await Services.waitFor('Search', Timeouts.SCREEN_TRANSITION)
  })

  it('opens additional services and cancels back, just to confirm navigation works for any catalogue entry', async () => {
    const services = await $$(serviceButtonSelector()).getElements()

    if (!services.length) {
      throw new Error('No ServiceButtons rendered in the Services catalogue')
    }

    for (let i = 0; i < SERVICES_TO_EXERCISE; i++) {
      await services[i].waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await services[i].click()
      await ServiceLogin.waitFor('Back', Timeouts.SCREEN_TRANSITION)
      await ServiceLogin.tap('Back')
      await Services.waitFor('Search', Timeouts.SCREEN_TRANSITION)
    }
  })

  it('returns to the Home tab', async () => {
    await TabBar.tap('Home')
    await Home.waitFor('SettingsMenuButton')
  })
})

describe('Account → All Account Details', () => {
  it('navigates to the Account tab', async () => {
    await Home.waitFor('SettingsMenuButton', Timeouts.SCREEN_TRANSITION)
    await TabBar.tap('Account')
    await Account.waitFor('AccountScreen')
    await Account.waitFor('AllAccountDetails')
  })

  it('opens All Account Details in the system browser and returns to the Account tab', async () => {
    const appId = await getCurrentAppId()
    await Account.tap('AllAccountDetails')
    // `handleAllAccountDetailsPress` resolves a quick-login URL then calls
    // `Linking.openURL`, which hands off to Safari (iOS) / Chrome (Android).
    // Pause to let the OS swap apps before pulling BCSC back to the front.
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await Account.waitFor('AccountScreen', Timeouts.SCREEN_TRANSITION)
  })

  it('opens My Devices in the system browser and returns to the Account tab', async () => {
    await Account.waitFor('MyDevices')
    await Account.tap('MyDevices')

    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    WebView.waitFor('Back', Timeouts.SCREEN_TRANSITION)
    await WebView.tap('Back')
    await Account.waitFor('AccountScreen', Timeouts.SCREEN_TRANSITION)
  })

  it('returns to the Home tab', async () => {
    await TabBar.tap('Home')
    await Home.waitFor('SettingsMenuButton')
  })
})
