import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { relaunchApp, selectAccountLandingIfPresent } from '../../../src/flows/auth.js'
import { chooseAddAccount, leaveVerificationToHome, startVerification } from '../../../src/flows/verify.js'
import { auditScreen, reportA11ySummary } from '../../../src/helpers/a11y-audit.js'
import { tapAtWindowPercent } from '../../../src/helpers/gestures.js'
import { reachCameraScreen } from '../../../src/helpers/screens.js'
import { AccountLandingScreen, EnterPINScreen } from '../../../src/screens/auth.js'
import { BaseScreen, bcsc } from '../../../src/screens/core/index.js'
import {
  AppSecurityScreen,
  AutoLockScreen,
  ChangePinScreen,
  HomeScreen,
  MainPrivacyPolicyScreen,
  MainVerifyPromptScreen,
  NotificationSettingsManagedScreen,
  NotificationSettingsUnsetScreen,
  QRCoreScreen,
  RemoveAccountConfirmScreen,
  SettingsScreen,
  TabBar,
  WalletScreen,
} from '../../../src/screens/main.js'
import {
  OnboardingCreatePINScreen,
  OnboardingIntroScreen,
  OnboardingNotificationsScreen,
  OnboardingOptInAnalyticsScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingSecureAppScreen,
  OnboardingSettingsScreen,
  OnboardingTermsOfUseScreen,
  VerifyPromptScreen,
} from '../../../src/screens/onboarding.js'
import {
  AccountSetupScreen,
  EnterBirthdateScreen,
  IdentitySelectionScreen,
  ManualSerialScreen,
  ScanSerialScreen,
} from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'
import { TestIds } from '../../../src/test-ids/registry.js'

/**
 * Accessibility journey: automated audits over the core screens.
 *
 * One cheap unverified session (no backend beyond the terms fetch, no SM credentials) that walks
 * onboarding → verification entry → Home/Wallet/scanner → Settings and its sub-screens → relaunch and
 * unlock, running `auditScreen` on each screen once it is settled. On iOS that is Apple's audit engine;
 * on Android the page-source/screenshot heuristics — see `helpers/a11y-audit.ts` for what each can and
 * cannot see. Findings never fail a checkpoint: they land in Allure + `reports/a11y/`, and the terminal
 * checkpoint fails only if no audit could run (or under A11Y_AUDIT_STRICT=1).
 *
 * Verified surfaces (Services, AccountDetails, Contacts, pairing) are not here — they cost an in-person
 * approval each, and belong as audit calls on the verified journeys once this lane has a baseline. The
 * in-app webviews (privacy Learn More, Help Centre) are skipped on purpose: their content is the website's,
 * and auditing it only buries the app's own findings under web ones (bullets flagged as tiny hit regions).
 * VoiceOver/TalkBack behaviour is not automatable at all — that pass stays manual with the UAT team.
 */

/** Engine handle for the testID-free surfaces (help-menu title, the terms button's enabled state). */
const engine = new BaseScreen()

describe('Accessibility journey: automated audits over the core screens', () => {
  before(() => {
    setTestUser(TestUsers.photo)
  })

  it('audits the onboarding intro on cold start', async () => {
    await OnboardingIntroScreen.expectVisible(Timeouts.COLD_START)
    await auditScreen('OnboardingIntro')
  })

  it('audits the pre-auth Settings surface and backs out', async () => {
    await OnboardingIntroScreen.tap('menu')
    await OnboardingSettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('OnboardingSettings')
    await OnboardingSettingsScreen.back.tap()
    await OnboardingIntroScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the privacy policy and the help menu', async () => {
    await OnboardingIntroScreen.tap('primary')
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('OnboardingPrivacyPolicy')

    // The help panel has no testIDs — its title proves it opened; a tap on the dimmed area closes it.
    await OnboardingPrivacyPolicyScreen.help.open()
    const title = await engine.findByText('Need help?')
    await title.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await auditScreen('HelpMenu')
    await tapAtWindowPercent(0.08, 0.5)
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the terms of use once they have loaded', async () => {
    await OnboardingPrivacyPolicyScreen.tap('primary')
    await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Accept enables only once the fetched terms render — audit the loaded screen, not the spinner.
    const accept = await engine.findByTestId(bcsc(TestIds.onboarding.termsOfUse.acceptAndContinue))
    await accept.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await auditScreen('OnboardingTermsOfUse')
    await OnboardingTermsOfUseScreen.tapWhenEnabled('primary')
  })

  it('audits the analytics opt-in', async () => {
    await OnboardingOptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('OnboardingOptInAnalytics')
    await OnboardingOptInAnalyticsScreen.tap('secondary')
  })

  it('audits the notifications prompt when offered, then SecureApp', async () => {
    // Absent when push permission is already granted — the app jumps straight to SecureApp.
    const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
    for (;;) {
      if (await OnboardingNotificationsScreen.isPresent(1_000)) {
        await auditScreen('OnboardingNotifications')
        await OnboardingNotificationsScreen.tap('secondary')
        break
      }
      if (await OnboardingSecureAppScreen.isPresent(1_000)) break
      if (Date.now() > deadline) {
        throw new Error('Neither Notifications nor SecureApp appeared after the analytics opt-in')
      }
    }
    await OnboardingSecureAppScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('OnboardingSecureApp')
    await OnboardingSecureAppScreen.tap('primary')
  })

  it('audits the Create PIN form and creates the PIN', async () => {
    await OnboardingCreatePINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('OnboardingCreatePIN')
    await OnboardingCreatePINScreen.fill('pin', TEST_PIN)
    await OnboardingCreatePINScreen.fill('confirmPin', TEST_PIN)
    await OnboardingCreatePINScreen.link('understand')
    await OnboardingCreatePINScreen.tapWhenEnabled('primary')
  })

  it('audits the verify prompt', async () => {
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('VerifyPrompt')
  })

  it('audits the verification entry: account setup and identity selection', async () => {
    await startVerification()
    await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('AccountSetup')
    await chooseAddAccount()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('IdentitySelection')
  })

  it('audits the serial scanner, manual serial entry and the birthdate form, then leaves to Home', async () => {
    await IdentitySelectionScreen.tapToNavigate('primary')
    await reachCameraScreen('ScanSerial', () => ScanSerialScreen.isPresent(1_000))
    await auditScreen('ScanSerial')
    await ScanSerialScreen.tapToNavigate('primary')
    await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('ManualSerial')
    await ManualSerialScreen.fill('serial', getTestUser().cardSerial, { tapFirst: true })
    await engine.dismissKeyboard()
    await ManualSerialScreen.tapWhenEnabled('primary')
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('EnterBirthdate')
    // Stop short of the birthdate submit (backend authorize) — leave through the help menu, keeping
    // the session unverified and backend-free.
    await leaveVerificationToHome()
  })

  it('audits unverified Home and the empty Wallet tab', async () => {
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('Home')
    await TabBar.link('wallet')
    // The Credo agent boots for any authenticated user — allow it the cold-start budget.
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await auditScreen('Wallet')
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the verify redirect off the Services tab', async () => {
    await TabBar.link('services')
    await MainVerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('MainVerifyPrompt')
    await MainVerifyPromptScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the QR scanner', async () => {
    await HomeScreen.link('scanFab')
    // Accept the camera permission whenever the OS raises it; the tab bar is the screen's marker.
    await reachCameraScreen('QRCore scanner', () => QRCoreScreen.isPresent(1_000))
    await auditScreen('QRScanner')
    await QRCoreScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits Settings', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('Settings')
  })

  it('audits App Security', async () => {
    await SettingsScreen.link('appSecurity')
    await AppSecurityScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('AppSecurity')
    await AppSecurityScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the Change PIN form', async () => {
    await SettingsScreen.link('changePin')
    await ChangePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('ChangePIN')
    await ChangePinScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits Auto Lock', async () => {
    await SettingsScreen.link('autoLock')
    await AutoLockScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('AutoLock')
    await AutoLockScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits Notification settings', async () => {
    await SettingsScreen.link('notifications')
    // Onboarding skipped the push prompt, so this mounts the unset branch — unless the device
    // remembered an earlier prompt, in which case the OS-managed branch is what renders.
    if (await NotificationSettingsUnsetScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      await auditScreen('NotificationSettings')
      await NotificationSettingsUnsetScreen.back.tap()
    } else {
      await NotificationSettingsManagedScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      await auditScreen('NotificationSettingsManaged')
      await NotificationSettingsManagedScreen.back.tap()
    }
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the Privacy screen', async () => {
    await SettingsScreen.link('privacy')
    await MainPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('PrivacyPolicy')
    await MainPrivacyPolicyScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the remove-account confirmation and cancels', async () => {
    await SettingsScreen.link('removeAccount')
    await RemoveAccountConfirmScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('RemoveAccountConfirm')
    await RemoveAccountConfirmScreen.back.tap() // header Back = cancel
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('audits the unlock flow after a relaunch: AccountLanding and EnterPIN', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    await auditScreen('AccountLanding')
    await AccountLandingScreen.tap('primary')
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await auditScreen('EnterPIN')
    // The PIN auto-submits on the 6th digit; Continue is the fallback when it does not navigate.
    await EnterPINScreen.fill('pin', TEST_PIN)
    if (!(await HomeScreen.isPresent(Timeouts.SCREEN_TRANSITION))) {
      await EnterPINScreen.tapWhenEnabled('primary')
      await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    }
  })

  it('reports the accessibility audit roll-up', async () => {
    await reportA11ySummary()
  })
})
