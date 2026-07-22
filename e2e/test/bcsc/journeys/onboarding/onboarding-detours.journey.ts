import { TEST_PIN, Timeouts } from '../../../../src/constants.js'
import { skipNotificationsIfShown } from '../../../../src/flows/onboarding.js'
import { tapAtWindowPercent } from '../../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../../src/screens/core/BaseScreen.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingTermsOfUseScreen,
  OnboardingWebViewScreen,
  VerifyPromptScreen,
} from '../../../../src/screens/onboarding.js'

/**
 * Onboarding detours journey.
 *
 * Same fresh-install session as the happy path, but takes every recoverable detour on the way:
 * header back-navigation, the privacy Learn-More webview, the floating help menu, the analytics
 * decline, and the PIN visibility toggles. One checkpoint per detour, so a failure reports exactly
 * which detour broke (mocha bail skips the rest of THIS file; other journey files still run).
 */

/** Engine handle for the few help-menu elements that expose no testIDs (matched by visible text). */
const engine = new BaseScreen()

describe('Onboarding journey: detours', () => {
  it('cold-starts and advances to the privacy policy', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
    await OnboardingIntroScreen.tap('primary')
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('privacy policy: header back returns to the intro and forward again', async () => {
    await OnboardingPrivacyPolicyScreen.back.tap()
    await OnboardingIntroScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingIntroScreen.tap('primary')
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('privacy policy: Learn More opens the in-app webview and returns', async () => {
    await OnboardingPrivacyPolicyScreen.link('learnMore')
    // The webview renders no content testIDs — give the push a beat, then pop via the header back.
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await OnboardingWebViewScreen.back.tap()
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('help menu: opens from the header and closes', async () => {
    await OnboardingPrivacyPolicyScreen.help.open()
    // The menu's rows and close button expose no testIDs (app copy: "Need help?" panel sliding in
    // from the right) — assert via the title text, close by tapping the dimmed area outside it.
    const title = await engine.findByText('Need help?')
    await title.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await tapAtWindowPercent(0.08, 0.5)
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('accepts the terms of use', async () => {
    await OnboardingPrivacyPolicyScreen.tap('primary')
    await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingTermsOfUseScreen.tapWhenEnabled('primary')
  })

  it('declines the analytics opt-in', async () => {
    await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingOptInAnalyticsScreen.tap('secondary')
  })

  it('skips notifications when the screen is offered', async () => {
    await skipNotificationsIfShown()
  })

  it('chooses a PIN to secure the app', async () => {
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingSecureAppScreen.tap('primary')
  })

  it('creates the PIN after exercising the visibility toggles', async () => {
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Toggle each input on then off so both masked and revealed states render.
    await OnboardingCreatePINScreen.link('pin1Visibility')
    await OnboardingCreatePINScreen.link('pin1Visibility')
    await OnboardingCreatePINScreen.link('pin2Visibility')
    await OnboardingCreatePINScreen.link('pin2Visibility')
    await OnboardingCreatePINScreen.fill('pin', TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', TEST_PIN)
    await OnboardingCreatePINScreen.link('understand')
    await OnboardingCreatePINScreen.tapWhenEnabled('primary')
  })

  it('reaches the verify prompt after the detour walk', async () => {
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
