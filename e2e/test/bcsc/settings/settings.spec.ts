/**
 * BCSC Settings tests — walks the Settings menu in the order the rows render.
 * Tests chain: each test assumes it starts on the Settings screen and ends
 * there, with Sign Out being the documented exception (lands on Home via the
 * AccountSelector after account re-selection).
 *
 * Pre-condition: the user is verified and resting on the Home tab.
 */
import { randomBytes } from 'node:crypto'

import { TEST_PIN, UPDATED_TEST_PIN, Timeouts } from '../../../src/constants.js'
import { swipeUpBy } from '../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const AccountSelector = new BaseScreen(BCSC_TestIDs.AccountSelector)
const MainAppSecurity = new BaseScreen(BCSC_TestIDs.MainAppSecurity)
const ChangePIN = new BaseScreen(BCSC_TestIDs.ChangePIN)
const EditNickname = new BaseScreen(BCSC_TestIDs.EditNickname)
const AutoLock = new BaseScreen(BCSC_TestIDs.AutoLock)
const Forget = new BaseScreen(BCSC_TestIDs.ForgetAllPairings)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const MainPrivacyPolicy = new BaseScreen(BCSC_TestIDs.MainPrivacyPolicy)
const MainContactUs = new BaseScreen(BCSC_TestIDs.MainContactUs)
const EnterPIN = new BaseScreen(BCSC_TestIDs.EnterPIN)
const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)

/**
 * Nickname written by the Edit Nickname test and read by the Sign Out test so
 * we can both locate the correct account card on AccountSelector and
 * cross-check that the rename round-tripped through logout.
 */
let newNickname = ''

/**
 * Tracks the current PIN across tests. Starts as TEST_PIN (set during
 * onboarding) and is updated to UPDATED_TEST_PIN by the Change PIN test.
 */
let currentPin = TEST_PIN

/**
 * Cached package (Android) / bundle id (iOS) of the app under test. Captured
 * lazily by the first external-browser test while BCSC is still in the
 * foreground, so `driver.activateApp(...)` can return to it after
 * `Linking.openURL` hands control to the system browser.
 */
let bcscAppId = ''

/** Pause after a `Linking.openURL` call before re-activating the app. */
const BROWSER_HANDOFF_PAUSE_MS = 2000

/**
 * Capture the current app's package/bundle id on first call and cache it
 * for subsequent calls. Must be invoked while the app under test is in the
 * foreground (not the browser).
 */
async function ensureBcscAppId(): Promise<string> {
  if (bcscAppId) return bcscAppId
  if (driver.isIOS) {
    const info = (await driver.execute('mobile: activeAppInfo')) as { bundleId?: string }
    if (!info?.bundleId) {
      throw new Error('Unable to resolve iOS bundle id from mobile: activeAppInfo')
    }
    bcscAppId = info.bundleId
  } else {
    bcscAppId = await driver.getCurrentPackage()
  }
  return bcscAppId
}

/**
 * Tap the account card matching the given nickname on the AccountSelector
 * screen. Cards are rendered by `CardButton.tsx` with a default testID of
 * `com.ariesbifold:id/CardButton-${title}`.
 */
async function tapAccountCard(nickname: string): Promise<void> {
  const testId = `com.ariesbifold:id/CardButton-${nickname}`
  const selector = driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`
  const card = await $(selector)
  await card.waitForDisplayed({ timeout: Timeouts.elementVisible })
  await card.click()
}

describe('Settings', () => {
  it('opens the Settings menu from the Home tab', async () => {
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
  })

  it('edits the account nickname and verifies it persists', async () => {
    // 7 lowercase-hex chars — unique per run so later assertions can't
    // pass against a stale pre-existing value. Stored in the module-level
    // `newNickname` so the Sign Out test can cross-check that the rename
    // survives logout and shows up on the AccountSelector.
    newNickname = randomBytes(4).toString('hex').slice(0, 7)

    await Settings.tap('EditNickname')
    await EditNickname.waitFor('SaveAndContinue')

    // Platform-specific input handling — the onboarding Nickname spec
    // uses this same split because the Android TextInput sits inside a
    // pressable wrapper while iOS exposes the TextInput directly.
    if (driver.isAndroid) {
      await EditNickname.tap('AccountNicknameInput')
      await EditNickname.type('AccountNicknameInput', newNickname, {
        tapFirst: true,
        characterByCharacter: false,
      })
    } else {
      await EditNickname.tap('AccountNicknamePressable')
      await EditNickname.type('AccountNicknamePressable', newNickname, { tapFirst: true })
    }
    await EditNickname.dismissKeyboard()

    // Save — EditNicknameScreen calls navigation.goBack() on success, so
    // we land back on Settings without any further interaction.
    await EditNickname.tap('SaveAndContinue')
    await Settings.waitFor('AutoLock')

    // Re-open Edit Nickname and verify the new value is rendered in the
    // input. `findByText` matches the TextInput's text on Android and its
    // value on iOS.
    await Settings.tap('EditNickname')
    const nicknameText = await EditNickname.findByText(newNickname)
    await nicknameText.waitForDisplayed({ timeout: Timeouts.elementVisible })
    await EditNickname.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('shows a duplicate-nickname validation error and lets the user back out', async () => {
    // Re-open Edit Nickname. The form's local state is seeded from
    // `store.bcsc.selectedNickname` (which is now `newNickname` after
    // the previous test), so tapping Save without changing anything
    // submits the same value. `getNicknameValidationErrorKey` → `hasNickname`
    // (account-utils.ts) flags it as a duplicate because the current
    // nickname is always in the nicknames list, and the form renders the
    // `BCSC.NicknameAccount.NameAlreadyExists` string inline.
    await Settings.tap('EditNickname')
    await EditNickname.waitFor('SaveAndContinue')
    await EditNickname.tap('SaveAndContinue')
    const errorText = await EditNickname.findByText('This nickname already exists')
    await errorText.waitForDisplayed({ timeout: Timeouts.elementVisible })
    // Navigate back to Settings without saving.
    await EditNickname.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('signs out, re-selects the renamed account, and lands on Home', async () => {
    // Exception to "stay on Settings": logout() dispatches
    // SELECT_ACCOUNT: undefined + DID_AUTHENTICATE: false, routing to the
    // AccountSelector. After tapping the account card, unlockApp() runs and
    // we end up back on Home. This test also cross-checks that the nickname
    // rename from the previous test survives logout — the card on
    // AccountSelector must carry the new nickname.
    await Settings.tap('SignOut')
    // Anchor on the AuthStack header's SettingsMenuButton (rendered by
    // `createAuthSettingsHeaderButton`) rather than the localized
    // "Continue as:" heading — testID-based, not text-based, so copy
    // changes can't silently break the test.
    await AccountSelector.waitFor('SettingsMenuButton', Timeouts.screenTransition)
    await tapAccountCard(newNickname)
    await EnterPIN.waitFor('PINInput')
    await EnterPIN.type('PINInput', currentPin)
    await EnterPIN.tap('Continue')
    await Home.waitFor('SettingsMenuButton')
  })

  it('opens App Security, verifies PIN is the current method, and returns to Settings', async () => {
    // Previous test (Sign Out) ended on Home as its documented exception,
    // so re-open Settings before walking into the App Security row.
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
    await Settings.tap('AppSecurity')
    await MainAppSecurity.waitFor('LearnMoreButton')

    // The current-method indicator box should show "PIN".
    const pinLabel = await MainAppSecurity.findByText('PIN')
    await pinLabel.waitForDisplayed({ timeout: Timeouts.elementVisible })

    // "Create a PIN" card should be disabled (it's the active method).
    const pinButton = await MainAppSecurity.findByTestId('com.ariesbifold:id/ChoosePINButton')
    await pinButton.waitForDisplayed({ timeout: Timeouts.elementVisible })
    const pinEnabled = await pinButton.isEnabled()
    if (pinEnabled) throw new Error('Expected "Create a PIN" button to be disabled')

    // Device auth card should be enabled (it's the alternative).
    const deviceAuthButton = await MainAppSecurity.findByTestId('com.ariesbifold:id/ChooseDeviceAuthButton')
    await deviceAuthButton.waitForDisplayed({ timeout: Timeouts.elementVisible })
    const deviceAuthEnabled = await deviceAuthButton.isEnabled()
    if (!deviceAuthEnabled) throw new Error('Expected device auth button to be enabled')

    await MainAppSecurity.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('changes the PIN, verifying mismatch error and checkbox gate', async () => {
    const MISMATCH_PIN = '999999'

    await Settings.tap('ChangePIN')
    await ChangePIN.waitFor('EnterCurrentPIN')

    // Enter current PIN.
    await ChangePIN.type('EnterCurrentPIN', currentPin)

    // Enter the new PIN and a deliberate mismatch to trigger validation.
    await ChangePIN.type('EnterNewPIN', UPDATED_TEST_PIN)
    await ChangePIN.type('ReenterNewPIN', MISMATCH_PIN)
    await ChangePIN.dismissKeyboard()

    // Check the checkbox so the button enables, then tap Change PIN
    // to trigger validation with the mismatched confirm PIN.
    await ChangePIN.tap('IUnderstand')
    await ChangePIN.tap('ChangePIN')

    const mismatchError = await ChangePIN.findByText('PIN does not match')
    await mismatchError.waitForDisplayed({ timeout: Timeouts.elementVisible })

    // Correct the confirm PIN — the error should clear on completion
    // because handleConfirmPINComplete calls setConfirmPINError(undefined).
    await ChangePIN.type('ReenterNewPIN', UPDATED_TEST_PIN)

    // Uncheck and verify the button is disabled.
    await ChangePIN.tap('IUnderstand')
    await ChangePIN.dismissKeyboard()
    const changePINButton = await ChangePIN.findByTestId('com.ariesbifold:id/ChangePIN')
    await changePINButton.waitForDisplayed({ timeout: Timeouts.elementVisible })
    const enabledWhenUnchecked = await changePINButton.isEnabled()
    if (enabledWhenUnchecked) throw new Error('Expected Change PIN button to be disabled without checkbox')

    // Re-check and submit.
    await ChangePIN.tap('IUnderstand')
    await ChangePIN.tap('ChangePIN')

    // Success navigates back to Settings. The new PIN is implicitly
    // verified by the auto-lock expiry test which re-authenticates
    // with `currentPin` after the inactivity timer fires.
    await Settings.waitFor('AutoLock')
    currentPin = UPDATED_TEST_PIN
  })

  it('sets Auto Lock to 3 min and verifies the row updates', async () => {
    await Settings.tap('AutoLock')
    await AutoLock.waitFor('AutoLockTime3')
    await AutoLock.tap('AutoLockTime3')
    await AutoLock.tap('BackButton')
    await Settings.waitFor('AutoLock')
    const adornment3 = await Settings.findByText('3 min')
    await adornment3.waitForDisplayed({ timeout: Timeouts.elementVisible })
  })

  it('sets Auto Lock to 5 min and verifies the row updates', async () => {
    await Settings.tap('AutoLock')
    await AutoLock.waitFor('AutoLockTime5')
    await AutoLock.tap('AutoLockTime5')
    await AutoLock.tap('BackButton')
    await Settings.waitFor('AutoLock')
    const adornment5 = await Settings.findByText('5 min')
    await adornment5.waitForDisplayed({ timeout: Timeouts.elementVisible })
  })

  it('sets Auto Lock to 1 min and waits for the session to expire', async () => {
    await Settings.tap('AutoLock')
    await AutoLock.waitFor('AutoLockTime1')
    await AutoLock.tap('AutoLockTime1')
    await AutoLock.tap('BackButton')
    await Settings.waitFor('AutoLock')
    const adornment1 = await Settings.findByText('1 min')
    await adornment1.waitForDisplayed({ timeout: Timeouts.elementVisible })

    // Wait for the 1-minute inactivity timer to fire. BCSCActivityContext
    // calls logout() which routes to AccountSelector. Extra 10 s absorbs
    // timer precision and navigation transition time.
    await driver.pause(70_000)

    await AccountSelector.waitFor('SettingsMenuButton', Timeouts.screenTransition)
    await tapAccountCard(newNickname)
    await EnterPIN.waitFor('PINInput')
    await EnterPIN.type('PINInput', currentPin)
    await EnterPIN.tap('Continue')
    await Home.waitFor('SettingsMenuButton')
  })

  it('forgets all pairings, dismisses the success alert, and returns to Settings', async () => {
    // Previous test (Auto Lock expiry) ended on Home, so re-open Settings.
    await TabBar.tap('SettingsMenuButton')
    await Settings.waitFor('AutoLock')
    await Settings.tap('ForgetPairings')
    await Forget.waitFor('ForgetAllPairings')
    await Forget.tap('ForgetAllPairings')
    // After the network call, ForgetAllPairingsScreen fires an RN
    // `Alert.alert` titled "Success" via `useAlerts.forgetPairingsAlert`
    // and then `navigation.goBack()`. iOS maps this to a real
    // `UIAlertController` that Appium's alert API can dismiss directly
    // — but `wdio.ios.local.sim.conf.ts` sets `autoAcceptAlerts: true`,
    // so on the local sim the alert may already be gone by the time we
    // look for it. On Android RN renders Alert.alert as an app-owned
    // `AlertDialog` widget, so `driver.acceptAlert()` can't see it and
    // we have to tap the OK button by visible text instead.
    if (driver.isIOS) {
      try {
        await browser.waitUntil(async () => driver.isAlertOpen().catch(() => false), {
          timeout: Timeouts.elementVisible,
        })
        await driver.acceptAlert()
      } catch {
        // `autoAcceptAlerts` already handled it; fall through to the
        // post-condition assertion.
      }
    } else {
      const successHeading = await Forget.findByText('Success')
      await successHeading.waitForDisplayed({ timeout: Timeouts.screenTransition })
      const okButton = await Forget.findByText('OK')
      await okButton.click()
    }
    await Settings.waitFor('AutoLock')
  })

  it('toggles Analytics Opt In to the opposite state', async () => {
    // Scroll the Analytics Opt In row into view so its ON/OFF end-adornment
    // is observable before and after the tap.
    await Settings.waitFor('AnalyticsOptIn')

    // SettingsContent.tsx renders `endAdornmentText` as "ON" or "OFF"
    // based on `store.bcsc.analyticsOptIn`. Probe which one is currently
    // visible to determine the starting state.
    const onBefore = await Settings.findByText('ON')
    const isCurrentlyOn = await onBefore.isDisplayed().catch(() => false)

    await Settings.tap('AnalyticsOptIn')

    // Verify the adornment flipped to the opposite value.
    const expectedAfter = isCurrentlyOn ? 'OFF' : 'ON'
    const after = await Settings.findByText(expectedAfter)
    await after.waitForDisplayed({ timeout: Timeouts.elementVisible })
  })

  it('shows the Remove Account confirmation and cancels', async () => {
    await Settings.tap('RemoveAccount')
    // SettingsContent.tsx `onPressRemoveAccount` calls `emitAlert` which
    // routes through `showAlert` → RN `Alert.alert` with the
    // `Alerts.CancelMobileCardSetup` strings: title "Are you sure?",
    // Cancel + destructive "Reset App" buttons. iOS renders a real
    // `UIAlertController` (Appium alert API works); Android renders an
    // app-owned `AlertDialog` (text-based fallback required).
    if (driver.isIOS) {
      try {
        await browser.waitUntil(async () => driver.isAlertOpen().catch(() => false), {
          timeout: Timeouts.elementVisible,
        })
        // `dismissAlert` taps the cancel-style button — exactly what we want.
        await driver.dismissAlert()
      } catch {
        // `autoAcceptAlerts` already handled it; fall through to the
        // post-condition assertion.
      }
    } else {
      const heading = await Settings.findByText('Are you sure?')
      await heading.waitForDisplayed({ timeout: Timeouts.elementVisible })
      // Android Material upper-cases AlertDialog button labels.
      const cancelButton = await Settings.findByText('CANCEL')
      await cancelButton.click()
    }
    await Settings.waitFor('AutoLock')
  })

  it('opens Help in the in-app WebView and returns to Settings', async () => {
    // Scroll to the bottom of Settings first so the Information section
    // rows are within scroll range. `Settings.tap` then auto-scrolls
    // back up to find the Help row.
    await Settings.scrollTo('Analytics')
    await swipeUpBy(0.15)
    await Settings.tap('Help')
    await WebView.waitFor('Back')
    const supportGuide = await WebView.findByText('Support guide')
    await supportGuide.waitForDisplayed({ timeout: Timeouts.screenTransition })
    await WebView.tap('Back')
    await Settings.waitFor('AutoLock')
  })

  it('opens Privacy and returns to Settings', async () => {
    await Settings.tap('Privacy')
    await MainPrivacyPolicy.waitFor('PrivacyPolicyBCLoginLink')
    await MainPrivacyPolicy.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('opens Contact Us and returns to Settings', async () => {
    await Settings.tap('ContactUs')
    // The Toll Free / Lower Mainland Link components don't always expose
    // their testID reliably on Android, so anchor on the screen heading
    // text (`BCSC.ContactUs.Title` = "Service BC Help Desk") which is
    // rendered as a plain ThemedText at the top of the screen.
    const heading = await MainContactUs.findByText('Service BC Help Desk')
    await heading.waitForDisplayed({ timeout: Timeouts.elementVisible })
    await MainContactUs.tap('BackButton')
    await Settings.waitFor('AutoLock')
  })

  it('launches Feedback URL in the browser and returns to the app', async () => {
    // Capture the app package while BCSC is still in the foreground so
    // `driver.activateApp(...)` can bring it back after the external
    // browser takes over.
    const appId = await ensureBcscAppId()
    await Settings.tap('Feedback')
    await driver.pause(BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await Settings.waitFor('AutoLock')
  })

  it('launches Accessibility URL in the browser and returns to the app', async () => {
    const appId = await ensureBcscAppId()
    await Settings.tap('Accessibility')
    await driver.pause(BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await Settings.waitFor('AutoLock')
  })

  it('launches Terms of Use URL in the browser and returns to the app', async () => {
    const appId = await ensureBcscAppId()
    await Settings.tap('TermsOfUse')
    await driver.pause(BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await Settings.waitFor('AutoLock')
  })

  it('launches Analytics URL in the browser and returns to the app', async () => {
    const appId = await ensureBcscAppId()
    await Settings.tap('Analytics')
    await driver.pause(BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await Settings.waitFor('AutoLock')
  })

  it('backs out of Settings to Home', async () => {
    await Settings.tap('BackButton')
    await Home.waitFor('WhereToUse')
  })

  it.skip('confirms Remove Account and factory resets the app to onboarding', async () => {
    // Final, destructive test — after this the app is back in the
    // pre-onboarding state and cannot chain into any further Settings
    // tests. Running this spec again requires re-onboarding the device.
    await Settings.tap('RemoveAccount')
    if (driver.isIOS) {
      // iOS renders a real UIAlertController; `driver.acceptAlert()` taps
      // the non-cancel action, which is the "Reset App" destructive
      // button given the actions order
      // (`SettingsContent.tsx onPressRemoveAccount`).
      try {
        await browser.waitUntil(async () => driver.isAlertOpen().catch(() => false), {
          timeout: Timeouts.elementVisible,
        })
        await driver.acceptAlert()
      } catch {
        // `autoAcceptAlerts` on the iOS local sim may have already
        // tapped the default action for us.
      }
    } else {
      const heading = await Settings.findByText('Are you sure?')
      await heading.waitForDisplayed({ timeout: Timeouts.elementVisible })
      // Android Material upper-cases AlertDialog button labels.
      const resetButton = await Settings.findByText('RESET APP')
      await resetButton.click()
    }
    // `factoryReset()` tears down secure storage and navigation state;
    // the app lands back on the AccountSetup onboarding screen. Use the
    // generous `appLaunch` timeout to absorb the reset work.
    await AccountSetup.waitFor('AddAccount', Timeouts.appLaunch)
  })
})
