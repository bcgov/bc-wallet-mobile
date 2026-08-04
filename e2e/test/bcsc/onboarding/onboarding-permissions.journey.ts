import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { answerNotificationPermission } from '../../../src/flows/onboarding.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingNotificationsDisabledScreen,
  OnboardingNotificationsScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingTermsOfUseScreen,
  VerifyPromptScreen,
} from '../../../src/screens/onboarding.js'

/**
 * Onboarding journey: granted notification permission.
 *
 * The one onboarding branch that needs the OS permission to be GRANTED: after the user allows push
 * notifications, the analytics screen stops routing through the Notifications screen at all
 * (`OnboardingOptInAnalyticsScreen.nextScreen` reads the live status and jumps to SecureApp).
 *
 * It needs its own fresh install because permission answers are one-way within a session: iOS never
 * re-prompts after a refusal, and Android only re-prompts once. The opposite answer — and the
 * `PermissionDisabled` variant it unlocks — lives in `onboarding-detours.journey.ts`.
 *
 * Assumes Android 13+ (runtime POST_NOTIFICATIONS), i.e. that push permission is NOT granted on a
 * fresh install. On an older Android the first analytics answer would already skip Notifications and
 * the enable checkpoint below would have nothing to drive.
 */
describe('Onboarding journey: notification permission granted', () => {
  it('walks to the analytics opt-in and accepts it', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
    await OnboardingIntroScreen.tap('primary')

    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingPrivacyPolicyScreen.tap('primary')

    // The terms body is a fetched WebView; accept stays disabled until it finishes loading.
    await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingTermsOfUseScreen.tapWhenEnabled('primary')

    await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingOptInAnalyticsScreen.tap('primary')
  })

  it('grants the OS notification permission from the Notifications screen', async () => {
    // Permission has never been requested at this point, so the screen is offered rather than skipped.
    await answerNotificationPermission('allow')
  })

  it('keeps the normal Notifications body once permission is granted', async () => {
    // The mirror of the detours journey's refusal branch: `checkPermissions` only swaps in
    // PermissionDisabled for a denied/blocked status, so a granted user re-entering the screen still
    // sees the enable/skip pair.
    await OnboardingSecureAppScreen.back.tap()
    await OnboardingNotificationsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(
      await OnboardingNotificationsDisabledScreen.isVisible('openSettings'),
      false,
      'PermissionDisabled must not render once the permission is granted'
    )
  })

  it('skips the Notifications screen entirely on the next pass', async () => {
    await OnboardingNotificationsScreen.back.tap()
    await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingOptInAnalyticsScreen.tap('primary')

    // The branch under test: with permission already granted the analytics screen navigates straight
    // to SecureApp. Assert the absence first so a regression fails here rather than in a scroll hunt.
    assert.equal(
      await OnboardingNotificationsScreen.isPresent(Timeouts.ELEMENT_VISIBLE),
      false,
      'Notifications must be skipped once push permission is already granted'
    )
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('finishes onboarding on the verify prompt', async () => {
    await OnboardingSecureAppScreen.tap('primary')
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingCreatePINScreen.fill('pin', TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', TEST_PIN)
    await OnboardingCreatePINScreen.link('understand')
    await OnboardingCreatePINScreen.tapWhenEnabled('primary')
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
