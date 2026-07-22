import { TEST_PIN, Timeouts, WRONG_TEST_PIN } from '../../../../src/constants.js'
import { relaunchApp, selectAccountLandingIfPresent, unlockWithPin } from '../../../../src/flows/auth.js'
import { skipToHome } from '../../../../src/flows/onboarding.js'
import { AccountLandingScreen, EnterPINScreen, LockoutScreen } from '../../../../src/screens/auth.js'
import { HomeScreen } from '../../../../src/screens/main.js'

/**
 * Auth/unlock journey.
 *
 * Arrange is UI-driven: onboard + skip to unverified Home, then every relaunch lands on
 * AccountLanding → EnterPIN (`didAuthenticate` is in-memory). Ordered checkpoints, destructive
 * last: unlock happy path → wrong-PIN inline error (single miss; the native attempt counter resets
 * on the subsequent success) → five consecutive misses → the timed Lockout screen (terminal — the
 * app stays locked for 1 minute, so nothing runs after it).
 *
 * SessionRecovery is deliberately absent: `sessionRecoveryRequired` is derived from native secure
 * storage at hydration (verified account with no refresh token) and has no UI-reachable trigger.
 */

describe('Auth journey: unlock', () => {
  it('onboards and skips to unverified Home', async () => {
    await skipToHome()
  })

  it('relaunches to AccountLanding and unlocks with the PIN', async () => {
    await unlockWithPin(TEST_PIN, { relaunch: true })
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
    for (let attempt = 1; attempt <= 7; attempt++) {
      await EnterPINScreen.fill('pin', WRONG_TEST_PIN)
      if (await LockoutScreen.isPresent(2_000)) {
        break
      }
    }
    await LockoutScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
