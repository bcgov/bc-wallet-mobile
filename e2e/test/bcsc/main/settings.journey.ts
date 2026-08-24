import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts, UPDATED_TEST_PIN, WRONG_TEST_PIN } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { findByA11yLabel, rowShowsWord } from '../../../src/helpers/a11y.js'
import { acceptSystemAlert } from '../../../src/helpers/alerts.js'
import { returnFromBrowserHandoff } from '../../../src/helpers/browser-handoff.js'
import { getCurrentAppId } from '../../../src/helpers/deep-link.js'
import { expectWebViewOpen } from '../../../src/helpers/webview.js'
import { BaseScreen } from '../../../src/screens/core/index.js'
import {
  AppSecurityScreen,
  AutoLockScreen,
  ChangePinScreen,
  HomeScreen,
  MainPrivacyPolicyScreen,
  MainWebViewScreen,
  NotificationSettingsManagedScreen,
  NotificationSettingsUnsetScreen,
  RemoveAccountConfirmScreen,
  ResetWalletConfirmScreen,
  SettingsRowIds,
  SettingsScreen,
  TabBar,
  WalletScreen,
} from '../../../src/screens/main.js'
import { OnboardingIntroScreen } from '../../../src/screens/onboarding.js'

/** Engine handle for the untestID'd inline strings (PIN errors, the reset-wallet title). */
const engine = new BaseScreen()

/** ChangePIN inline errors (`BCSC.ChangePIN.*`, en) — bare ThemedText, no testIDs. */
const INCORRECT_PIN_ERROR = 'Incorrect PIN'
const PIN_MISMATCH_ERROR = 'PIN does not match'
/** Reset-wallet heading (`BCSC.Wallet.ResetTitle`, en) — proves WHICH destructive screen is up, since
 *  reset and remove share the `ConfirmDestructiveAction` id. */
const RESET_WALLET_TITLE = 'Reset your wallet?'
/** The OS-managed notification screen's status row is label-only (`NotificationsAreLabel` + word). */
const NOTIFICATIONS_ON_LABEL = 'Notifications are: on'
/** Header titles (`BCSC.Screens.*`, en) of the two Settings rows that push the SAME `MainWebView` route —
 *  the title is the only native field that says which page opened. */
const HELP_CENTRE_TITLE = 'Help Centre'
const CONTACT_US_TITLE = 'Contact Us'

/**
 * Main journey: settings (unverified-safe rows).
 *
 * Arrange: `skipToHome()`. Settings is reachable unverified from the Home tab header, and the bulk of
 * its rows render for the onboarded-unverified (authenticated) user — the `isVerified`-gated rows
 * (Profile / ForgetPairings / Contacts / AddDevice / MyDevices) are absent and belong to the verified
 * photo journey. One `it` per row/detour so a failure isolates. The account-destroying
 * remove-account confirm is the TERMINAL checkpoint.
 *
 * Rows + navigation verified against app source (`SettingsContent.tsx` + `MainStack.tsx`); every
 * sub-screen returns via the shared header `Back`.
 *
 * ⚠️ First-run notes (confirm on Sauce):
 *   - Change-PIN sets the app PIN to `UPDATED_TEST_PIN`; the re-fill of the confirm field after the
 *     mismatch assumes `fill` replaces (PIN inputs may auto-submit at 6 digits — tune if it appends).
 *   - Notification settings: Android below 13 grants with NO dialog (acceptSystemAlert no-ops); the
 *     managed-branch ON assert assumes the dialog (where raised) is ACCEPTED — a deny would poison
 *     re-runs on real devices, which is why no deny-path checkpoint exists.
 *   - The external-link checkpoint (Feedback/Accessibility/Terms) and reset-wallet confirm rely on
 *     `queryAppState`/`activateApp` and a Credo re-init respectively — both new surfaces on Sauce.
 *   - Help and Contact Us push the SAME in-app `MainWebView` (help-centre pages, no content testIDs) —
 *     asserted by the native WebView + header title (helpers/webview.ts), never the page content.
 *   - Remove-account confirm factory-resets to the onboarding Intro — confirm the post-reset landing.
 *   - Auto-lock inactivity expiry sits idle ~66s (1-min timeout + margin; newCommandTimeout is 180s),
 *     then re-unlocks with `UPDATED_TEST_PIN` — the slowest checkpoint. It assumes the inactivity
 *     logout lands on the same AccountLanding→EnterPIN auth flow as a cold start (`unlockWithPin`).
 */
describe('Main journey: settings', () => {
  it('onboards and skips to unverified Home', async () => {
    await skipToHome()
  })

  it('opens Settings and hides the verified-only rows', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('profile'), false, 'Profile is verified-gated')
    assert.equal(await SettingsScreen.isVisible('forgetPairings'), false, 'ForgetPairings is verified-gated')
  })

  it('toggles Analytics Opt In and the row adornment tracks it', async () => {
    // Onboarding declined analytics, so the row starts OFF. The adornment has no testID: Android reads
    // the child text, iOS the flattened row's derived label (see rowShowsWord).
    assert.ok(await rowShowsWord(SettingsRowIds.analytics, 'OFF'), 'analytics row should start OFF')
    await SettingsScreen.link('analytics') // toggles in place — no navigation
    // OFF→ON initializes the tracker asynchronously and quietly stays OFF if that throws — poll, and
    // name the silent-failure branch if it never lands.
    await driver.waitUntil(async () => rowShowsWord(SettingsRowIds.analytics, 'ON'), {
      timeout: Timeouts.ELEMENT_VISIBLE,
      timeoutMsg: 'analytics never showed ON — tracker init may have silently failed (ON→OFF only dispatches)',
    })
    await SettingsScreen.link('analytics')
    await driver.waitUntil(async () => rowShowsWord(SettingsRowIds.analytics, 'OFF'), {
      timeout: Timeouts.ELEMENT_VISIBLE,
      timeoutMsg: 'analytics did not return to OFF',
    })
  })

  it('opens App Security and backs out', async () => {
    await SettingsScreen.link('appSecurity')
    await AppSecurityScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // ChoosePINButton
    await AppSecurityScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens the Help Centre webview and returns', async () => {
    await SettingsScreen.link('help')
    await expectWebViewOpen({ title: HELP_CENTRE_TITLE })
    await MainWebViewScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens Privacy and returns', async () => {
    await SettingsScreen.link('privacy')
    await MainPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // LearnMore (don't tap — navigates on)
    await MainPrivacyPolicyScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens the Contact Us webview and returns', async () => {
    await SettingsScreen.link('contactUs')
    await expectWebViewOpen({ title: CONTACT_US_TITLE }) // same route as Help — the title is the tell
    await MainWebViewScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('enables push from Notification settings, crossing from the unset to the OS-managed branch', async function () {
    await SettingsScreen.link('notifications')
    // The onboarding arrange SKIPS the push prompt, so the screen deterministically mounts its UNSET
    // branch; enabling runs the OS prompt and re-renders the SAME mount into the OS-managed branch.
    if (await NotificationSettingsUnsetScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      await NotificationSettingsUnsetScreen.tap('primary')
      // iOS and Android 13+ raise a system dialog; older Android grants silently — accept is a no-op then.
      await acceptSystemAlert()
    } else {
      // A device that remembered an earlier prompt skips straight to OS-managed — still a valid traversal.
      console.warn(
        '[settings-journey] notification prompt already ran on this device; asserting the managed branch only'
      )
    }
    await NotificationSettingsManagedScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The ON/OFF status word has no testID — the row's a11y label is the assert surface.
    const status = findByA11yLabel(NOTIFICATIONS_ON_LABEL)
    await status.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await NotificationSettingsManagedScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // And the Settings row's own adornment now reads ON (driven by the live OS status).
    assert.ok(await rowShowsWord(SettingsRowIds.notifications, 'ON'), 'Notifications row should show ON')
  })

  it('opens the external Feedback, Accessibility and Terms links and returns', async () => {
    // All three rows are bare Linking.openURL calls: the app-side observable is losing the foreground,
    // and coming back to an intact Settings screen. Browser content is out of scope by design.
    const appId = await getCurrentAppId()
    for (const row of ['feedback', 'accessibility', 'termsOfUse'] as const) {
      await SettingsScreen.link(row)
      await returnFromBrowserHandoff(appId)
      await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    }
  })

  it('changes the PIN, exercising the wrong-current, mismatch and checkbox-gate errors', async () => {
    await SettingsScreen.link('changePin')
    await ChangePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // EnterCurrentPIN (submit testID collides with the row)
    // Wrong CURRENT PIN first. Validation only reaches the native verify once every field is 6 digits,
    // new matches confirm, AND the checkbox is ticked — so this arrangement isolates that branch.
    await ChangePinScreen.fill('current', WRONG_TEST_PIN)
    await ChangePinScreen.fill('newPin', UPDATED_TEST_PIN)
    await ChangePinScreen.fill('confirm', UPDATED_TEST_PIN)
    await ChangePinScreen.link('understand') // a TOGGLE — tick once here, leave ticked for the rest
    await ChangePinScreen.tap('primary')
    await engine.waitForText(INCORRECT_PIN_ERROR, Timeouts.SCREEN_TRANSITION) // untestID'd inline error
    await ChangePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Mismatched confirm next (that check fires BEFORE the checkbox gate, so the tick stays put).
    await ChangePinScreen.fill('current', TEST_PIN)
    await ChangePinScreen.fill('confirm', WRONG_TEST_PIN)
    await ChangePinScreen.tap('primary')
    await engine.waitForText(PIN_MISMATCH_ERROR, Timeouts.SCREEN_TRANSITION)
    await ChangePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Correct the confirm → submit succeeds → back on Settings (PIN is now UPDATED_TEST_PIN).
    await ChangePinScreen.fill('confirm', UPDATED_TEST_PIN)
    await ChangePinScreen.tap('primary')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('sets Auto Lock to 3 minutes', async () => {
    await SettingsScreen.link('autoLock')
    await AutoLockScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await AutoLockScreen.link('time3') // saved immediately on tap
    await AutoLockScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(await rowShowsWord(SettingsRowIds.autoLock, '3 min'), 'Auto Lock row should show "3 min"')
  })

  it('auto-locks after the inactivity timeout and re-unlocks with the changed PIN', async () => {
    await SettingsScreen.link('autoLock')
    await AutoLockScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await AutoLockScreen.link('time1') // 1-minute timeout — the autoLockTime effect resets the timer live
    await AutoLockScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Sit idle past the 1-min timeout; the activity context logs the user out to the auth flow. A wdio
    // query is not a device touch, so it won't reset the app timer; newCommandTimeout is 180s so a
    // single 66s pause keeps the Appium session alive.
    await driver.pause(66_000)
    await unlockWithPin(UPDATED_TEST_PIN) // PIN was changed above; re-unlock lands on Home
  })

  it('shows the Remove Account confirmation and cancels', async () => {
    await HomeScreen.tap('menu') // re-open Settings (the re-unlock landed on Home)
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('removeAccount')
    await RemoveAccountConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // ConfirmDestructiveAction
    await RemoveAccountConfirmScreen.back.tap() // header Back = cancel
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('shows the Reset Wallet confirmation and cancels', async () => {
    await SettingsScreen.link('resetWallet') // distinct destructive row; shared DestructiveConfirmationScreen
    await ResetWalletConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // ConfirmDestructiveAction
    await ResetWalletConfirmScreen.back.tap() // header Back = cancel
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resets the wallet (confirm) and lands back on Settings with the account intact', async () => {
    await SettingsScreen.link('resetWallet')
    await ResetWalletConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Reset and Remove share the ConfirmDestructiveAction id — the heading proves WHICH screen is up.
    await engine.waitForText(RESET_WALLET_TITLE, Timeouts.SCREEN_TRANSITION)
    // NOT terminal: the screen goBack()s immediately and a "Resetting wallet..." overlay covers
    // Settings until the Credo store is deleted and a fresh agent boots — so assert the landing with
    // the cold-start budget and never the transient overlay.
    await ResetWalletConfirmScreen.tap('primary')
    await SettingsScreen.expectVisible(Timeouts.COLD_START)
    // The account survives (Settings still renders its authenticated rows) and the Wallet tab gates
    // through to a fresh EMPTY wallet — the re-initialized store.
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await TabBar.link('wallet')
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await TabBar.link('home')
    // Home's FAB `self` renders on the Wallet tab too, so it cannot prove the switch — tap THROUGH to
    // Settings, leaving the journey where the terminal checkpoint expects it.
    await HomeScreen.tapToReach('menu', SettingsScreen)
  })

  it('removes the account (terminal) and returns to onboarding', async () => {
    await SettingsScreen.link('removeAccount')
    await RemoveAccountConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await RemoveAccountConfirmScreen.tap('primary') // ConfirmDestructiveAction → factory reset
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
  })
})
