import { TEST_PIN, Timeouts } from '../constants.js'
import { getCurrentAppId } from '../helpers/deep-link.js'
import { AccountLandingScreen, EnterPINScreen } from '../screens/auth.js'
import { HomeScreen } from '../screens/main.js'
import { OnboardingIntroScreen } from '../screens/onboarding.js'

/**
 * UI-driven auth/unlock arranges. `didAuthenticate` is in-memory, so every launch of an
 * onboarded user passes through AccountLanding → EnterPIN before reaching Home.
 */

/** Terminate and reactivate the app under test — the standard way to reach the unlock flow mid-session. */
export async function relaunchApp(): Promise<void> {
  const appId = await getCurrentAppId()
  await driver.terminateApp(appId)
  await driver.activateApp(appId)
}

/**
 * Send the app to the background for `seconds`, then bring it back to the foreground — WITHOUT
 * terminating it, so in-memory state survives and the app observes a real AppState background →
 * active transition (which is what auto-lock's backgrounded-too-long branch keys off).
 *
 * The wait is deliberately NOT the driver's. Asking a driver to hold the app down for N seconds —
 * `mobile: backgroundApp` with a POSITIVE `seconds`, or the legacy `driver.background(n)` — blocks
 * that one request for the whole duration (on iOS it is `POST /wda/deactivateApp {duration}`), and
 * Sauce's gateway terminates a session whose command has not answered within 60s. A 70s background
 * therefore killed the iOS 17 job mid-run: "did not receive any response ... within 60000 ms",
 * immediately followed by "A session is either terminated or not started".
 *
 * A NEGATIVE `seconds` means "leave it in the background" and returns straight away, so the wait
 * becomes a client-side `pause` (wdio implements it as a plain `setTimeout` — no driver traffic at
 * all, bounded by `newCommandTimeout` rather than the gateway), and `activateApp` resumes the still
 * running app. Keep any single driver command well under 60s on Sauce.
 */
export async function backgroundAppFor(seconds: number): Promise<void> {
  // Resolve the id while the app is still frontmost — `getCurrentAppId` reads the ACTIVE app, so
  // after backgrounding it would report the home screen / launcher instead.
  const appId = await getCurrentAppId()
  await driver.execute('mobile: backgroundApp', { seconds: -1 })
  await driver.pause(seconds * 1_000)
  await driver.activateApp(appId)
}

/**
 * Wait for AccountLanding, advancing past the returning-user intro (AuthIntro — the same component
 * as the onboarding intro, shown only when `hasSeenOnboardingIntro` was never recorded) if it
 * appears first. No-op when AccountLanding is already visible.
 */
export async function selectAccountLandingIfPresent(): Promise<void> {
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await AccountLandingScreen.isPresent(1_000)) {
      return
    }
    if (await OnboardingIntroScreen.isPresent(1_000)) {
      await OnboardingIntroScreen.tap('primary')
    }
    if (Date.now() > deadline) {
      throw new Error('AccountLanding did not appear (nor AuthIntro) within the launch timeout')
    }
  }
}

/**
 * Unlock to Home: AccountLanding → EnterPIN → Home. With `relaunch: true`, terminates and
 * reactivates the app first — the standard way to reach the unlock flow mid-session.
 *
 * The PIN auto-submits on the 6th digit; when that doesn't navigate within the transition window,
 * the Continue button is tapped as a fallback.
 */
export async function unlockWithPin(pin: string = TEST_PIN, options: { relaunch?: boolean } = {}): Promise<void> {
  if (options.relaunch) {
    await relaunchApp()
  }

  await selectAccountLandingIfPresent()
  await AccountLandingScreen.tap('primary')

  await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterPINScreen.fill('pin', pin)

  if (!(await HomeScreen.isPresent(Timeouts.SCREEN_TRANSITION))) {
    await EnterPINScreen.tapWhenEnabled('primary')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  }
}
