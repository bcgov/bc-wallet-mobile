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
 * Background the app for `seconds`, then foreground it. Nothing here terminates the app, so it sees a
 * real AppState background → active transition — what auto-lock's backgrounded-too-long branch keys
 * off. The OS may still evict a backgrounded app on its own, so in-memory state surviving is likely
 * but not guaranteed: callers that depend on it must assert their own post-resume marker (see the
 * short-background control step in `auth-unlock.journey.ts`).
 *
 * The wait is deliberately not the driver's. A POSITIVE `seconds` (or the legacy
 * `driver.background(n)`) blocks that one request for its full duration, and Sauce terminates a
 * session whose command hasn't answered within 60s — which is how a 70s background killed the iOS 17
 * job. A NEGATIVE `seconds` means "leave it there" and returns at once, so the wait becomes a
 * client-side `pause` (wdio implements it as a plain `setTimeout`). Keep any single driver command
 * well under 60s on Sauce.
 */
export async function backgroundAppFor(seconds: number): Promise<void> {
  // Resolve while frontmost — `getCurrentAppId` reads the ACTIVE app.
  const appId = await getCurrentAppId()
  // Cross-platform: XCUITest and UiAutomator2 both register `mobile: backgroundApp` (the latter
  // already defaults `seconds` to -1). It is NOT an iOS-only extension.
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
