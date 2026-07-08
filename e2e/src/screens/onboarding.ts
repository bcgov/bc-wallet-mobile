import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Onboarding stack screen objects (v4.1 `OnboardingStack` + the VerifyPrompt entry that follows it).
 *
 * Flow: Intro → PrivacyPolicy → TermsOfUse → OptInAnalytics → Notifications → SecureApp → CreatePIN
 * → (onboarding complete) → VerifyPrompt.
 *
 * Every testID key is drawn from the shared {@link TestIds} registry — no string literals here — so a
 * renamed key is a one-line registry edit and `tsc` flags any stale reference.
 */

const { common } = TestIds
const ob = TestIds.onboarding

/**
 * First screen shown at app launch on a fresh install (`OnboardingIntro`, the stack's initial route).
 * No back button — it is the root of the stack.
 * `primary` (Continue) → PrivacyPolicy · `secondary` (LearnMore) → Help Centre webview.
 */
export const OnboardingIntroScreen = defineScreen({
  self: bcsc(ob.intro.continue),
  primary: bcsc(ob.intro.continue),
  secondary: bcsc(ob.intro.learnMore),
  help: bcsc(common.help),
})

/**
 * Privacy policy (`OnboardingPrivacyPolicy`). `primary` (Continue) → TermsOfUse.
 */
export const OnboardingPrivacyPolicyScreen = defineScreen({
  self: bcsc(ob.privacyPolicy.continue),
  primary: bcsc(ob.privacyPolicy.continue),
  back: bcsc(common.back),
  help: bcsc(common.help),
})

/**
 * Terms of use (`OnboardingTermsOfUse`). The terms render in a WebView fetched from the backend;
 * `primary` (AcceptAndContinue) stays disabled until it loads, and is replaced by the `retry` link if
 * the fetch fails. `primary` → OptInAnalytics.
 */
export const OnboardingTermsOfUseScreen = defineScreen({
  self: bcsc(ob.termsOfUse.acceptAndContinue),
  primary: bcsc(ob.termsOfUse.acceptAndContinue),
  back: bcsc(common.back),
  help: bcsc(common.help),
  links: {
    retry: bcsc(ob.termsOfUse.retry),
  },
})

/**
 * Analytics opt-in (`OnboardingOptInAnalytics`). Both choices advance: `primary` (Accept) /
 * `secondary` (Decline) → Notifications (or straight to SecureApp when notification permission is
 * already granted).
 */
export const OnboardingOptInAnalyticsScreen = defineScreen({
  self: bcsc(ob.optInAnalytics.accept),
  primary: bcsc(ob.optInAnalytics.accept),
  secondary: bcsc(ob.optInAnalytics.decline),
  back: bcsc(common.back),
  help: bcsc(common.help),
})

/**
 * Push-notifications prompt (`OnboardingNotifications`). `primary` (EnableNotifications) triggers the
 * OS permission dialog; `secondary` (SkipNotifications) skips it. Both → SecureApp.
 */
export const OnboardingNotificationsScreen = defineScreen({
  self: bcsc(ob.notifications.enable),
  primary: bcsc(ob.notifications.enable),
  secondary: bcsc(ob.notifications.skip),
  back: bcsc(common.back),
  help: bcsc(common.help),
})

/**
 * "Secure your app" selector (`OnboardingSecureApp`, rendered by `SecurityMethodSelector`). The
 * `deviceAuth` link only appears when the device/emulator has biometrics or a passcode configured;
 * `primary` (ChoosePINButton) is always present, so it is the reliable `self`.
 * `primary` → CreatePIN · `deviceAuth` completes onboarding directly.
 */
export const OnboardingSecureAppScreen = defineScreen({
  self: bcsc(ob.secureApp.choosePin),
  primary: bcsc(ob.secureApp.choosePin),
  back: bcsc(common.back),
  help: bcsc(common.help),
  links: {
    deviceAuth: bcsc(ob.secureApp.chooseDeviceAuth),
  },
})

/**
 * "Create a PIN" form (`OnboardingCreatePIN`, rendered by `PINEntryForm` with `creatingNewPIN`, so
 * the confirm button's testID is `CreatePIN`, not `Continue`). Completing this screen finishes
 * onboarding (`hasAccount` becomes true) and the app advances to the VerifyPrompt.
 * Fill `pin` then `confirmPin`, tap the `understand` acknowledgement, then `primary` (CreatePIN).
 */
export const OnboardingCreatePINScreen = defineScreen({
  self: bcsc(ob.createPin.pin),
  primary: bcsc(ob.createPin.createPin),
  back: bcsc(common.back),
  help: bcsc(common.help),
  inputs: {
    pin: bcsc(ob.createPin.pin),
    confirmPin: bcsc(ob.createPin.confirmPin),
  },
  links: {
    understand: bcsc(ob.createPin.understand),
  },
})

/**
 * One-time verify prompt shown after onboarding completes, before the main app (entry screen of
 * `VerifyStack`). This is the seam that makes stacks independently testable: `secondary`
 * (SkipVerification) records `hasSeenVerifyPrompt` and lands on Home unverified.
 * `primary` (Continue) → begins verification (AccountSetup) · `secondary` → Home.
 */
export const VerifyPromptScreen = defineScreen({
  self: bcsc(ob.verifyPrompt.continue),
  primary: bcsc(ob.verifyPrompt.continue),
  secondary: bcsc(ob.verifyPrompt.skipVerification),
})
