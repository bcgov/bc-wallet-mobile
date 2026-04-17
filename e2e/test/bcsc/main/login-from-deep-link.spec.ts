/**
 * Deep-link login e2e — two sibling suites:
 *
 *  - Warm start (AC #2): app already running on Home; dispatch deep link via
 *    Appium `mobile: deepLink`, walk the happy path through ServiceLoginScreen
 *    and PairingConfirmation, and unwind back to Home with two back gestures.
 *    PairingConfirmation in the iOS app-switch flow has no Close control
 *    (the screen guides the user to the OS back-to-Safari shortcut), so we
 *    pop the stack instead of tapping Cancel/Close.
 *
 *  - Cold start (AC #1): terminate the app, dispatch the deep link to
 *    re-launch it, re-authenticate, and confirm ServiceLoginScreen renders
 *    seeded with the deep-link params. Relies on MainStack consuming the
 *    buffered pending pairing on mount (see MainStack.tsx:57) and using
 *    ServiceLogin as initialRouteName.
 *
 * Both suites mint a fresh deep link in their `before` hook — pairing codes
 * are short-lived and the cold-start suite can't reuse the warm-start link.
 *
 * Preconditions for both: app is onboarded and resting on the Home tab.
 * Spec is not imported by full-regression.spec.ts yet — run standalone
 * with --spec while we validate Appium deep-link behaviour on Sauce RDC.
 */
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { currentPlatform, dispatchDeepLink, getCurrentAppId } from '../../../src/helpers/deep-link.js'
import { navigateBack } from '../../../src/helpers/gestures.js'
import { fetchPairingDeepLink } from '../../../src/helpers/pairing-code.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const Home = new BaseScreen(BCSC_TestIDs.Home)
const ServiceLogin = new BaseScreen(BCSC_TestIDs.ServiceLogin)
const PairingConfirmation = new BaseScreen(BCSC_TestIDs.PairingConfirmation)
const EnterPIN = new BaseScreen(BCSC_TestIDs.EnterPIN)

/** Pause after `terminateApp` to let the OS settle before re-launching via deep link. */
const TERMINATE_SETTLE_MS = 500

/**
 * Tap the AccountSelector card if it appears post-cold-launch. Mirrors the
 * recovery branch in settings.spec.ts — on single-account devices the app
 * may skip straight to PIN entry, so the absence of a card is not an error.
 */
async function tapAccountCardIfPresent(): Promise<void> {
  const selector = driver.isIOS
    ? '-ios predicate string:name BEGINSWITH "com.ariesbifold:id/CardButton-"'
    : 'android=new UiSelector().resourceIdMatches(".*CardButton-.*")'
  try {
    const card = await $(selector)
    await card.waitForDisplayed({ timeout: 5000 })
    await card.click()
  } catch {
    // No card surfaced within the window — assume PIN screen is next.
  }
}

/**
 * Shared setup for both deep-link suites: wait for Home, capture the app id,
 * mint a fresh pairing deep link, and log a masked suffix so CI archives
 * don't retain an active pairing code.
 */
async function prepareDeepLinkSession(logTag: string): Promise<{ appId: string; deepLink: string }> {
  await Home.waitFor('SettingsMenuButton', Timeouts.screenTransition)
  const appId = await getCurrentAppId()
  const session = await fetchPairingDeepLink({ platform: currentPlatform() })
  const masked = `***${session.pairingCode.slice(-2)}`
  console.log(
    `[${logTag}] minted ${session.scheme}://...${masked} for "${session.clientName}" (tx ${session.transactionId})`
  )
  return { appId, deepLink: session.deepLink }
}

describe('Login From Deep Link — warm start', () => {
  let appId = ''
  let deepLink = ''

  before(async () => {
    ;({ appId, deepLink } = await prepareDeepLinkSession('deep-link'))
  })

  it('routes the deep link to ServiceLoginScreen', async () => {
    await dispatchDeepLink(deepLink, appId)
    await ServiceLogin.waitFor('ServiceLoginCancel', Timeouts.screenTransition)
  })

  it('continues to the PairingConfirmation screen', async () => {
    await ServiceLogin.waitFor('ServiceLoginContinue', Timeouts.screenTransition)
    await ServiceLogin.tap('ServiceLoginContinue')
  })

  it('saves bookmark for the logged-in service', async () => {
    await PairingConfirmation.waitFor('ToggleBookmark', Timeouts.screenTransition)
    await PairingConfirmation.tap('ToggleBookmark')
  })

  it('returns to the Home tab via two back gestures', async () => {
    // PairingConfirmation hides its Close button on iOS app-switch flows
    // (see PairingConfirmation.tsx:53). Two back gestures pop the stack:
    // PairingConfirmation → ServiceLogin → Home.
    await navigateBack()
    await navigateBack()
    await Home.waitFor('SettingsMenuButton', Timeouts.screenTransition)
  })
})

describe('Login From Deep Link — cold start', () => {
  let appId = ''
  let deepLink = ''

  before(async () => {
    ;({ appId, deepLink } = await prepareDeepLinkSession('deep-link cold-start'))
  })

  it('terminates the app, dispatches the deep link, and re-authenticates into ServiceLoginScreen', async () => {
    await driver.terminateApp(appId)
    await driver.pause(TERMINATE_SETTLE_MS)
    await dispatchDeepLink(deepLink, appId)

    // Cold-launch sequence: AccountSelector (multi-account devices only) →
    // EnterPIN → MainStack mounts and consumes the buffered pending pairing
    // → ServiceLogin is the initial route.
    await tapAccountCardIfPresent()
    await EnterPIN.waitFor('PINInput', Timeouts.appLaunch)
    await EnterPIN.type('PINInput', TEST_PIN)
    await EnterPIN.tap('Continue')

    await ServiceLogin.waitFor('ServiceLoginCancel', Timeouts.appLaunch)
  })

  it('cancels back to the Home tab', async () => {
    // ServiceLogin onCancel falls through to navigate(Tab, Home) when the
    // screen was the initial route (see ServiceLoginScreen.tsx:469-485).
    await ServiceLogin.tap('ServiceLoginCancel')
    await Home.waitFor('SettingsMenuButton', Timeouts.screenTransition)
  })
})
