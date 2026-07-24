import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts, UPDATED_TEST_PIN, WRONG_TEST_PIN } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { skipToHome } from '../../../../src/flows/onboarding.js'
import {
  AppSecurityScreen,
  AutoLockScreen,
  ChangePinScreen,
  HomeScreen,
  MainContactUsScreen,
  MainPrivacyPolicyScreen,
  MainWebViewScreen,
  RemoveAccountConfirmScreen,
  ResetWalletConfirmScreen,
  SettingsScreen,
} from '../../../../src/screens/main.js'
import { OnboardingIntroScreen } from '../../../../src/screens/onboarding.js'

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
 *   - Contact Us anchors on the toll-free-number testID (i18n-derived); confirm it resolves on device.
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

  it('toggles Analytics Opt In', async () => {
    await SettingsScreen.link('analytics') // toggles ON/OFF in place — no navigation
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens App Security and backs out', async () => {
    await SettingsScreen.link('appSecurity')
    await AppSecurityScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // ChoosePINButton
    await AppSecurityScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens the Help webview and returns', async () => {
    await SettingsScreen.link('help')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS) // bare WebView, no content testID
    await MainWebViewScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens Privacy and returns', async () => {
    await SettingsScreen.link('privacy')
    await MainPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // LearnMore (don't tap — navigates on)
    await MainPrivacyPolicyScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens Contact Us and returns', async () => {
    await SettingsScreen.link('contactUs')
    await MainContactUsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // toll-free link testID
    await MainContactUsScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('changes the PIN, exercising the mismatch error and the checkbox gate', async () => {
    await SettingsScreen.link('changePin')
    await ChangePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // EnterCurrentPIN (submit testID collides with the row)
    await ChangePinScreen.fill('current', TEST_PIN)
    await ChangePinScreen.fill('newPin', UPDATED_TEST_PIN)
    // Mismatched confirm + gate checked → submit is still blocked (stay on the form).
    await ChangePinScreen.fill('confirm', WRONG_TEST_PIN)
    await ChangePinScreen.link('understand')
    await ChangePinScreen.tap('primary') // ChangePIN submit
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

  it('removes the account (terminal) and returns to onboarding', async () => {
    await SettingsScreen.link('removeAccount')
    await RemoveAccountConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await RemoveAccountConfirmScreen.tap('primary') // ConfirmDestructiveAction → factory reset
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
  })
})
