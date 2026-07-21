import { TEST_PIN, Timeouts } from '../constants.js'
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
 * UI-driven onboarding arranges (FND-5). There is no app-side state seeding — these walks are how
 * journeys earn their preconditions. Fresh install → VerifyPrompt is ~8–10 taps; the only network
 * dependency is the Terms-of-Use fetch (its accept button stays disabled until the terms load).
 */

/**
 * The app skips the Notifications screen when push permission is already granted (jumps straight
 * to SecureApp), so wait for whichever of the two appears and skip notifications when offered.
 */
async function skipNotificationsIfShown(): Promise<void> {
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
 * Complete the full onboarding walk from a fresh cold start, ending on the VerifyPrompt.
 *
 * Declines analytics and skips push notifications (avoids the OS permission dialog) so the arrange
 * has minimal side effects; journeys that test those choices drive the screens directly instead.
 *
 * The VerifyPrompt exists only in this session — relaunching afterwards lands on
 * AccountLanding → EnterPIN → Home, never back here (its gate is in-memory in the app).
 */
export async function completeOnboarding(pin: string = TEST_PIN): Promise<void> {
  await OnboardingIntroScreen.expectVisible(Timeouts.APP_LAUNCH)
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
