import { TEST_PIN, Timeouts } from '../constants.js'
import { acceptSystemAlert, dismissSystemAlert } from '../helpers/alerts.js'
import { HomeScreen } from '../screens/main.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingNotificationsScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingTermsOfUseScreen,
  VerifyPromptScreen,
} from '../screens/onboarding.js'

/**
 * UI-driven onboarding arranges. There is no app-side state seeding — these walks are how
 * journeys earn their preconditions. Fresh install → VerifyPrompt is ~8–10 taps; the only network
 * dependency is the Terms-of-Use fetch (its accept button stays disabled until the terms load).
 */

/**
 * The app skips the Notifications screen when push permission is already granted (jumps straight
 * to SecureApp), so wait for whichever of the two appears and skip notifications when offered.
 */
export async function skipNotificationsIfShown(): Promise<void> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  for (;;) {
    if (await OnboardingNotificationsScreen.isPresent(1_000)) {
      await OnboardingNotificationsScreen.tap('secondary')
      return
    }
    if (await OnboardingSecureAppScreen.isPresent(1_000)) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error('Neither Notifications nor SecureApp appeared after the analytics opt-in')
    }
  }
}

/**
 * Grace period for the OS notification-permission dialog to appear after `EnableNotifications`. The
 * system permission controller can take several seconds to surface on a loaded real device, well past
 * the helper's 5s default.
 */
const PERMISSION_DIALOG_APPEAR_MS = 15_000

/**
 * Take the Notifications screen's `EnableNotifications` path and answer the OS permission dialog it
 * raises, ending on SecureApp (both answers advance).
 *
 * The app does not wait for us: on Android its permission request self-resolves after ~2s (a
 * workaround for a React Native hang, see `PushNotificationsHelper.requestNotificationPermission`),
 * so it can navigate to SecureApp while the dialog is still up. That only affects what the app
 * *recorded*; the OS permission itself is decided by this dialog, and every branch that keys off it
 * (`PermissionDisabled`, the analytics screen's skip-Notifications shortcut) re-reads the live status.
 * So resolve the dialog first, then assert the destination.
 */
export async function answerNotificationPermission(decision: 'allow' | 'deny'): Promise<void> {
  await OnboardingNotificationsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingNotificationsScreen.tap('primary')

  if (decision === 'allow') {
    await acceptSystemAlert(PERMISSION_DIALOG_APPEAR_MS)
  } else {
    await dismissSystemAlert(PERMISSION_DIALOG_APPEAR_MS)
  }

  await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Complete the full onboarding walk from a fresh cold start, ending on the VerifyPrompt.
 *
 * Declines analytics and skips push notifications (avoids the OS permission dialog) so the arrange
 * has minimal side effects; journeys that test those choices drive the screens directly instead.
 *
 * The VerifyPrompt exists only in this session — relaunching afterwards lands on
 * AccountLanding → EnterPIN → Home, never back here (its gate is in-memory in the app).
 */
export async function completeOnboarding(pin: string = TEST_PIN): Promise<void> {
  await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
  await OnboardingIntroScreen.tap('primary')

  await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingPrivacyPolicyScreen.tap('primary')

  // The terms render in a WebView fetched from the backend; accept enables once loaded.
  await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingTermsOfUseScreen.tapWhenEnabled('primary')

  await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingOptInAnalyticsScreen.tap('secondary')

  await skipNotificationsIfShown()

  await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingSecureAppScreen.tap('primary')

  await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OnboardingCreatePINScreen.fill('pin', pin)
  await OnboardingCreatePINScreen.fill('confirmPin', pin)
  await OnboardingCreatePINScreen.link('understand')
  await OnboardingCreatePINScreen.tapWhenEnabled('primary')

  await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Onboard and skip verification → unverified Home. The cheap arrange (~1–2 min) for auth/main
 * journeys. Arrival is asserted via the Home tab's scan FAB, which is not verification-gated.
 */
export async function skipToHome(pin: string = TEST_PIN): Promise<void> {
  await completeOnboarding(pin)
  await VerifyPromptScreen.tap('secondary')
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}
