import { TEST_PIN, Timeouts } from '../constants.js'
import { getCurrentAppId } from '../helpers/deep-link.js'
import { describeCurrentScreen } from '../helpers/screens.js'
import { AccountLandingScreen, EnterPINScreen } from '../screens/auth.js'
import type { ScreenPresence } from '../screens/core/defineScreen.js'
import { HomeScreen } from '../screens/main.js'
import { OnboardingIntroScreen } from '../screens/onboarding.js'

/**
 * UI-driven auth/unlock arranges. `didAuthenticate` is in-memory, so every launch of an
 * onboarded user passes through AccountLanding → EnterPIN before reaching Home — or, for a user
 * who chose to verify and has not finished, the verification step the app resumes onto.
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

/** Where an unlock may land: Home (skipped/verified users), a named screen, or anywhere off EnterPIN. */
export type UnlockLanding = 'home' | 'any' | ScreenPresence

/** Sampling interval while waiting for EnterPIN to leave once the PIN is in. */
const PIN_LEAVE_PROBE_MS = 500

async function waitForEnterPinToLeave(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (!(await EnterPINScreen.isVisible('pin'))) return true
    if (Date.now() > deadline) return false
    await driver.pause(PIN_LEAVE_PROBE_MS)
  }
}

/**
 * Type the PIN and wait for EnterPIN to leave. The PIN auto-submits on the 6th digit; Continue is the
 * fallback, tapped only while the pin input is still up — its `Continue` id is shared by a dozen
 * screens, so a blind tap after navigation lands on whatever the app resumed to.
 */
export async function submitPin(pin: string = TEST_PIN): Promise<void> {
  await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterPINScreen.fill('pin', pin)
  if (await waitForEnterPinToLeave(Timeouts.SCREEN_TRANSITION)) return
  await EnterPINScreen.tapWhenEnabled('primary')
  if (await waitForEnterPinToLeave(Timeouts.SCREEN_TRANSITION)) return
  throw new Error(`EnterPIN did not leave after the PIN was submitted. On screen: ${await describeCurrentScreen()}`)
}

/**
 * Unlock: AccountLanding → EnterPIN → `landing`. With `relaunch: true`, terminates and reactivates
 * the app first — the standard way to reach the unlock flow mid-session.
 *
 * Where the PIN lands is no longer always Home: an unverified user who chose "verify now" resumes
 * onto their verification step on every launch. 'home' (default) asserts Home; a screen object
 * asserts that screen; 'any' only proves EnterPIN left, for callers that branch on the landing.
 */
export async function unlockWithPin(
  pin: string = TEST_PIN,
  options: { relaunch?: boolean; landing?: UnlockLanding } = {}
): Promise<void> {
  if (options.relaunch) {
    await relaunchApp()
  }

  await selectAccountLandingIfPresent()
  await AccountLandingScreen.tap('primary')
  await submitPin(pin)

  const landing = options.landing ?? 'home'
  if (landing === 'home') {
    await HomeScreen.expectVisible(Timeouts.APP_LAUNCH)
  } else if (landing !== 'any') {
    await landing.expectVisible(Timeouts.APP_LAUNCH)
  }
}
