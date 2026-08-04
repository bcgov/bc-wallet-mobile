import assert from 'node:assert/strict'
import {
  BACKGROUND_LOCK_SECONDS,
  BACKGROUND_NO_LOCK_SECONDS,
  TEST_PIN,
  Timeouts,
  WRONG_TEST_PIN,
} from '../../../src/constants.js'
import {
  backgroundAppFor,
  relaunchApp,
  selectAccountLandingIfPresent,
  unlockWithPin,
} from '../../../src/flows/auth.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { expectWebViewOpen } from '../../../src/helpers/webview.js'
import { AccountLandingScreen, EnterPINScreen, LockoutScreen } from '../../../src/screens/auth.js'
import { AutoLockScreen, HomeScreen, SettingsScreen } from '../../../src/screens/main.js'

/**
 * Auth/unlock journey.
 *
 * Arrange is UI-driven: onboard + skip to unverified Home, then every relaunch lands on
 * AccountLanding → EnterPIN (`didAuthenticate` is in-memory). Ordered checkpoints, slowest and most
 * state-changing last: unlock happy path → wrong-PIN inline error (single miss; the native attempt
 * counter resets on the subsequent success) → five consecutive misses → the timed Lockout screen →
 * its unattended expiry → the background-timeout lock (TERMINAL: it leaves auto-lock at 1 minute,
 * which would race every checkpoint after it).
 *
 * Two slow, unattended waits live here — the ~1-minute lockout countdown and the 70s background —
 * so this file is the longest of the cheap journeys by design. Both are the assertion, not overhead.
 *
 * SessionRecovery is deliberately absent: `sessionRecoveryRequired` is derived at hydration from a
 * verified account with no refresh token, so it cannot be reached from this unverified session (see
 * the UAT-12 ticket for the verified-journey recipe).
 */

describe('Auth journey: unlock', () => {
  it('onboards and skips to unverified Home', async () => {
    await skipToHome()
  })

  it('relaunches to AccountLanding and unlocks with the PIN', async () => {
    await unlockWithPin(TEST_PIN, { relaunch: true })
  })

  it('opens Get Help (Forgot PIN) from the PIN screen', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    await AccountLandingScreen.tap('primary')
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // GetHelp pushes the Forgot-PIN AuthWebView. Assert the webview itself opened (a positive,
    // testID-free signal via the native WebView element) rather than that the PIN screen "left":
    // AuthStack keeps EnterPIN mounted underneath the pushed webview, so Android still reports its
    // PINInput as displayed. We do NOT tap the webview back — AuthStack sets no headerBackTestID, so
    // that button is not addressable — the next checkpoint's relaunchApp() recovers to AccountLanding.
    await EnterPINScreen.link('getHelp')
    await expectWebViewOpen(Timeouts.SCREEN_TRANSITION)
  })

  it('rejects a wrong PIN inline and unlocks on retry', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    await AccountLandingScreen.tap('primary')
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // The rejection copy is build-dependent (current main renders "Incorrect PIN"; older builds
    // clear the field behind a red "Enter your PIN" prompt) and has no testID — so assert the
    // behavior, not the copy: a wrong PIN must NOT unlock, and the correct PIN must then recover.
    await EnterPINScreen.fill('pin', WRONG_TEST_PIN)
    if (await HomeScreen.isPresent(Timeouts.ELEMENT_VISIBLE)) {
      throw new Error('Wrong PIN unexpectedly unlocked the app')
    }
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    await EnterPINScreen.fill('pin', TEST_PIN)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('locks the app after five consecutive wrong PINs', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    await AccountLandingScreen.tap('primary')
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // Native schedule: 5 consecutive misses → 1-minute lockout. The counter reset on the previous
    // checkpoint's successful unlock, so five attempts should suffice; the loop carries headroom
    // for a swallowed entry, and the per-attempt Lockout check doubles as error-settle time.
    for (let attempt = 1; attempt <= 6; attempt++) {
      await EnterPINScreen.fill('pin', WRONG_TEST_PIN)
      if (await LockoutScreen.isPresent(2_000)) {
        break
      }
    }
    await LockoutScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('auto-unlocks itself when the lockout countdown runs out', async () => {
    // Nothing is tapped here — the wait IS the assertion. The Lockout screen counts down the native
    // lock's remaining time and calls `unlockApp()` at zero, which routes a no-longer-locked
    // PIN account to EnterPIN. `isPresent` polls without the scroll-retry `expectVisible` would
    // spend on a screen that has nothing to scroll.
    assert.ok(
      await EnterPINScreen.isPresent(Timeouts.LOCKOUT_AUTO_UNLOCK),
      'the lockout did not release itself to EnterPIN within the countdown window'
    )
    await EnterPINScreen.fill('pin', TEST_PIN)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('shortens auto-lock and survives a background inside the timeout', async () => {
    // Distinct from the inactivity timer the settings journey covers: backgrounding CLEARS that timer
    // (its handle does not survive suspension) and the foreground handler instead compares elapsed
    // time against the configured timeout. Shorten the timeout first — the 5-minute default would
    // need a 5-minute background.
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('autoLock')
    await AutoLockScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await AutoLockScreen.link('time1') // saved immediately on tap; the activity context re-arms live
    await AutoLockScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // The control for the checkpoint below. Landing back on Home proves two things the lock
    // assertion depends on: a short background does NOT lock, and the app is RESUMED rather than
    // relaunched — a relaunch would reach the unlock screen for the ordinary in-memory
    // `didAuthenticate` reason, which would make the next checkpoint pass without proving anything.
    await backgroundAppFor(BACKGROUND_NO_LOCK_SECONDS)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('locks on return from a long background and re-unlocks with the PIN (terminal)', async () => {
    // Runs straight after the control so the foreground gap stays seconds long: idle here for a
    // minute and the inactivity timer would log the user out first, proving the wrong branch.
    await backgroundAppFor(BACKGROUND_LOCK_SECONDS)

    // Coming back logs the user out (`didAuthenticate` → false), so RootStack swaps to AuthStack and
    // the normal unlock spine applies.
    await unlockWithPin(TEST_PIN)
  })
})
