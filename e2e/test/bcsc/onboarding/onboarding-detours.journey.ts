import assert from 'node:assert/strict'
import { SHORT_TEST_PIN, TEST_PIN, Timeouts, WRONG_TEST_PIN } from '../../../src/constants.js'
import { answerNotificationPermission } from '../../../src/flows/onboarding.js'
import { scrollToSettingsVersionFooter } from '../../../src/helpers/developer.js'
import { tapAtWindowPercent } from '../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingNotificationsDisabledScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingSettingsScreen,
  OnboardingTermsOfUseScreen,
  OnboardingWebViewScreen,
  VerifyPromptScreen,
} from '../../../src/screens/onboarding.js'

/**
 * Onboarding detours journey.
 *
 * Same fresh-install session as the happy path, but takes every recoverable detour on the way:
 * header back-navigation, the privacy Learn-More webview, the floating help menu, the analytics
 * decline, the declined-notification-permission branch, and the PIN form's inline validation. One
 * checkpoint per detour, so a failure reports exactly which detour broke (mocha bail skips the rest
 * of THIS file; other journey files still run).
 *
 * The notification permission is DENIED here — that direction both exercises the `PermissionDisabled`
 * variant and leaves the device no more permissive than it started. The opposite answer (and the
 * screen-skipping branch it unlocks) needs its own fresh install: `onboarding-permissions.journey.ts`.
 */

/** Engine handle for the elements that expose no testIDs (matched by visible text). */
const engine = new BaseScreen()

/**
 * Inline validation copy on the CreatePIN form. `PINInput`'s error line and the checkbox error are
 * plain `ThemedText` nodes with no testIDs, so they are matched by their rendered string — keys
 * `BCSC.PIN.PINTooShort` / `PINsDoNotMatch` / `MustCheckBox` in `app/src/localization/en`.
 */
const CREATE_PIN_ERRORS = {
  tooShort: 'PIN must be 6 digits',
  mismatch: 'PINs do not match',
  uncheckedBox: 'You must check this box to continue.',
} as const

/**
 * Wait for a testID-free inline error to render.
 *
 * `waitForText` rather than a bare `findByText`, because these errors are not reliably ON SCREEN
 * when they appear: the form only drops the keyboard once a field reaches six digits, and while it
 * is up the keyboard-aware scroll keeps the FOCUSED field clear — which pushes an error belonging to
 * the other field above the fold. The hunt makes the assertion "the app rendered this" rather than
 * "this happens to be in the viewport".
 */
async function expectInlineError(message: string): Promise<void> {
  await engine.waitForText(message)
}

describe('Onboarding journey: detours', () => {
  it('opens onboarding Settings from the intro header, with no developer menu, and backs out', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START) // fresh install lands on the Intro
    await OnboardingIntroScreen.tap('menu') // Intro header Settings button → OnboardingSettings (SettingsContent)
    // Pre-auth, the AuthenticatedSection rows are absent; the always-rendered ContactUs row is the marker.
    await OnboardingSettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // A default install must not expose the developer menu. Scroll to the footer first so the
    // absence means "not rendered" rather than "below the fold" — the row sits directly above it.
    // Revealing it is covered where it is actually needed, in `auth/auth-intro.journey.ts`.
    await scrollToSettingsVersionFooter()
    assert.equal(
      await OnboardingSettingsScreen.isVisible('developerMode'),
      false,
      'the developer menu row must stay hidden on a default install'
    )

    await OnboardingSettingsScreen.back.tap() // → Intro
    await OnboardingIntroScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

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

  it('declines the OS notification permission and still reaches SecureApp', async () => {
    // Both answers advance; the app records the refusal and moves on.
    await answerNotificationPermission('deny')
  })

  it('re-entering Notifications after the refusal shows the permission-disabled variant', async () => {
    // The screen re-reads the live OS status on mount, so navigating BACK to it is what swaps the
    // enable/skip body for PermissionDisabled. OpenSettings hands off to the OS settings app — assert
    // it, never tap it; ContinueWithoutNotifications is the in-app way forward.
    await OnboardingSecureAppScreen.back.tap()
    await OnboardingNotificationsDisabledScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(
      await OnboardingNotificationsDisabledScreen.isVisible('openSettings'),
      'PermissionDisabled should offer OpenSettings alongside ContinueWithoutNotifications'
    )
    await OnboardingNotificationsDisabledScreen.tap('secondary')
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('chooses a PIN to secure the app', async () => {
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingSecureAppScreen.tap('primary')
  })

  it('rejects a short PIN, a mismatched confirmation and an unchecked acknowledgement', async () => {
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // Validation runs on submit and stops at the first failing rule, so the three are exercised in
    // the order the form checks them. Every rejection leaves the user on the form.
    await OnboardingCreatePINScreen.fill('pin', SHORT_TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', SHORT_TEST_PIN)
    await OnboardingCreatePINScreen.tap('primary')
    await expectInlineError(CREATE_PIN_ERRORS.tooShort)

    await OnboardingCreatePINScreen.fill('pin', TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', WRONG_TEST_PIN)
    await OnboardingCreatePINScreen.tap('primary')
    await expectInlineError(CREATE_PIN_ERRORS.mismatch)

    // Matching PINs, acknowledgement still unchecked → the checkbox error, and no PIN is set.
    await OnboardingCreatePINScreen.fill('confirmPin', TEST_PIN)
    await OnboardingCreatePINScreen.tap('primary')
    await expectInlineError(CREATE_PIN_ERRORS.uncheckedBox)
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('creates the PIN after exercising the visibility toggles', async () => {
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
