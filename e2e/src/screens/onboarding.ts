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
 * No back button — it is the root of the stack. `primary` (Continue) → PrivacyPolicy.
 * (No Learn-More button here — that detour lives on the Privacy Policy screen.)
 */
export const OnboardingIntroScreen = defineScreen({
  self: bcsc(ob.intro.continue),
  primary: bcsc(ob.intro.continue),
  help: bcsc(common.help),
  menu: bcsc(ob.intro.settings), // header-left Settings button → OnboardingSettings
})

/**
 * Privacy policy (`OnboardingPrivacyPolicy`). `primary` (Continue) → TermsOfUse ·
 * `learnMore` → in-app `OnboardingWebView` (pop it via the pushed screen's header Back).
 */
export const OnboardingPrivacyPolicyScreen = defineScreen({
  self: bcsc(ob.privacyPolicy.continue),
  primary: bcsc(ob.privacyPolicy.continue),
  back: bcsc(common.back),
  help: bcsc(common.help),
  links: {
    learnMore: bcsc(ob.privacyPolicy.learnMore),
  },
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
 * The `PermissionDisabled` variant of the SAME `OnboardingNotifications` route — it replaces the
 * enable/skip body once the user has been prompted and the live OS status is denied/blocked. The
 * check runs on mount, so it is reached by navigating BACK to the screen after refusing the dialog.
 *
 * `primary` (OpenSettings) leaves the app for the OS settings — assert it, never tap it in CI;
 * `secondary` (ContinueWithoutNotifications) → SecureApp.
 */
export const OnboardingNotificationsDisabledScreen = defineScreen({
  self: bcsc(ob.notifications.continueWithout),
  primary: bcsc(ob.notifications.openSettings),
  secondary: bcsc(ob.notifications.continueWithout),
  back: bcsc(common.back),
  help: bcsc(common.help),
  elements: {
    openSettings: bcsc(ob.notifications.openSettings),
    continueWithout: bcsc(ob.notifications.continueWithout),
  },
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
    pin1Visibility: bcsc(ob.createPin.pin1Visibility),
    pin2Visibility: bcsc(ob.createPin.pin2Visibility),
  },
})

/**
 * One-time verify prompt shown after onboarding completes, before the main app (entry screen of
 * `VerifyStack`). Its gate is in-memory in `RootStack`: the prompt exists ONLY in the session that
 * completed onboarding, and skipping persists nothing — a later cold start goes AccountLanding →
 * EnterPIN → Home, never back here.
 * `primary` (Continue) → begins verification (AccountSetup) · `secondary` (SkipVerification) → Home.
 */
export const VerifyPromptScreen = defineScreen({
  self: bcsc(ob.verifyPrompt.continue),
  primary: bcsc(ob.verifyPrompt.continue),
  secondary: bcsc(ob.verifyPrompt.skipVerification),
  elements: {
    skipVerification: bcsc(ob.verifyPrompt.skipVerification),
  },
})

/**
 * The in-app webview (`OnboardingWebView`, also registered per-stack as Auth/Verify/MainWebView).
 * The screen renders no testIDs of its own — the only stable handle is the stack header's Back
 * button, which every pushed onboarding screen shares. Use it only when the webview is known to be
 * on top (i.e. immediately after tapping a link that opened it).
 */
export const OnboardingWebViewScreen = defineScreen({
  self: bcsc(common.back),
  back: bcsc(common.back),
})

/**
 * OnboardingSettings — the settings surface reachable from the Intro header (it wraps the same
 * `SettingsContent` as Main). Reached PRE-authentication, so the `AuthenticatedSection` rows
 * (AppSecurity/ChangePIN/…) are ABSENT; the always-rendered Help-section `ContactUs` row (wired here)
 * is the reliable arrival marker. Header `back` returns to the Intro.
 */
export const OnboardingSettingsScreen = defineScreen({
  self: bcsc(TestIds.main.settings.contactUs),
  back: bcsc(common.back),
  links: {
    // Absent until the footer version line is tapped into developer mode (see `helpers/developer.ts`).
    developerMode: bcsc(TestIds.main.settings.developerMode),
  },
})
