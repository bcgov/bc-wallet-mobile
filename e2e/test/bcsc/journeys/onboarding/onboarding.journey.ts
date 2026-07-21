import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts } from '../../../../src/constants.js'
import { skipNotificationsIfShown } from '../../../../src/flows/onboarding.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingTermsOfUseScreen,
  VerifyPromptScreen,
} from '../../../../src/screens/onboarding.js'

/**
 * ONB-1 — Onboarding happy path journey.
 *
 * One session, ordered checkpoints: fresh install → full onboarding walk → CreatePIN → VerifyPrompt
 * offering both Continue and SkipVerification. This is the straight-through walk (it accepts
 * analytics, unlike the side-effect-free arrange flow, which declines); every recoverable detour
 * lives in `onboarding-detours.journey.ts`.
 */
describe('Onboarding journey: happy path', () => {
  it('cold-starts on the onboarding intro', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
  })

  it('advances to the privacy policy', async () => {
    await OnboardingIntroScreen.tap('primary')
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('accepts the terms of use once they load', async () => {
    await OnboardingPrivacyPolicyScreen.tap('primary')
    await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The terms body is a fetched WebView; accept stays disabled until it finishes loading.
    await OnboardingTermsOfUseScreen.tapWhenEnabled('primary')
  })

  it('accepts the analytics opt-in', async () => {
    await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingOptInAnalyticsScreen.tap('primary')
  })

  it('skips notifications when the screen is offered', async () => {
    // Absent when push permission is already granted — the app jumps straight to SecureApp.
    await skipNotificationsIfShown()
  })

  it('chooses a PIN to secure the app', async () => {
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingSecureAppScreen.tap('primary')
  })

  it('creates the PIN', async () => {
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingCreatePINScreen.fill('pin', TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', TEST_PIN)
    await OnboardingCreatePINScreen.link('understand')
    await OnboardingCreatePINScreen.tapWhenEnabled('primary')
  })

  it('lands on the verify prompt offering Continue and Skip', async () => {
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(
      await VerifyPromptScreen.isVisible('skipVerification'),
      'VerifyPrompt should offer SkipVerification alongside Continue'
    )
  })
})
