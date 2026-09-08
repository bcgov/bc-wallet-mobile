import { TEST_PIN, Timeouts } from '../constants.js'
import { acceptSystemAlertsUntil } from '../helpers/alerts.js'
import { describeCurrentScreen } from '../helpers/screens.js'
import { bcsc, defineScreen } from '../screens/core/index.js'

/**
 * Onboarding walk for the 4.0.3 release binary — the shipped previous version the upgrade suite
 * boots first (Sauce storage `BCSC-v4.0.3.*`, preserved from build run 7009).
 *
 * 4.0.3 predates the onboarding rework, so `flows/onboarding.ts` cannot drive it. Its flow:
 * AccountSetup → SetupTypes → IntroCarousel → PrivacyPolicy → OptInAnalytics → TermsOfUse →
 * Notifications → SecureApp → CreatePIN → the Setup Steps resting screen (the v3-like step list;
 * no VerifyPrompt or unverified tab bar existed yet).
 * The testIDs below are frozen copies of that release's values — most match today's registry,
 * but they are pinned here so current renames cannot break this walk.
 * Retire this module once 4.1.0 ships and becomes the previous release.
 */

// ── Frozen 4.0.3 screens ──

/** Developer (IAS) screen the dev build lands on at first boot; backing out reaches AccountSetup. */
const DeveloperScreen = defineScreen({
  self: bcsc('ToggleEnableProxy'),
  back: bcsc('Back'),
})

const AccountSetupScreen = defineScreen({
  self: bcsc('AddAccount'),
  primary: bcsc('AddAccount'),
})

/** Setup-type chooser; Continue enables after picking the "my own ID" radio. */
const SetupTypesScreen = defineScreen({
  self: bcsc('MyOwnIdRadioGroup'),
  primary: bcsc('Continue'),
  links: { myOwnId: bcsc('MyOwnIdRadioGroup') },
})

const IntroCarouselScreen = defineScreen({
  self: bcsc('CarouselNext'),
  primary: bcsc('CarouselNext'),
})

const PrivacyPolicyScreen = defineScreen({
  self: bcsc('Continue'),
  primary: bcsc('Continue'),
})

/** Analytics opt-in sits BEFORE the terms on 4.0.3 (today it is after). */
const OptInAnalyticsScreen = defineScreen({
  self: bcsc('Decline'),
  secondary: bcsc('Decline'),
})

const TermsOfUseScreen = defineScreen({
  self: bcsc('AcceptAndContinue'),
  primary: bcsc('AcceptAndContinue'),
})

/** Single Continue (no enable/skip split yet); tapping it can raise the OS permission dialog. */
const NotificationsScreen = defineScreen({
  self: bcsc('Continue'),
  primary: bcsc('Continue'),
})

const SecureAppScreen = defineScreen({
  self: bcsc('ChoosePINButton'),
  primary: bcsc('ChoosePINButton'),
})

/**
 * The Setup Steps resting screen after PIN creation, anchored on the header settings menu — the
 * onboarding stack renders no header, so its appearance marks arrival in the app shell.
 */
const SetupStepsScreen = defineScreen({
  self: bcsc('SettingsMenuButton'),
  menu: bcsc('SettingsMenuButton'),
})

/** PIN form; the confirm button was still the generic `Continue` (today: `CreatePIN`). */
const CreatePinScreen = defineScreen({
  self: bcsc('PINInput1'),
  primary: bcsc('Continue'),
  inputs: { pin: bcsc('PINInput1'), confirmPin: bcsc('PINInput2') },
  links: { understand: bcsc('IUnderstand') },
})

const MAX_CAROUSEL_PAGES = 10

/** Cold start lands on either AccountSetup or the Developer screen (seen on every Sauce boot). */
async function reachAccountSetup(): Promise<void> {
  const deadline = Date.now() + Timeouts.COLD_START
  for (;;) {
    if (await AccountSetupScreen.isPresent(1_000)) return
    if (await DeveloperScreen.isPresent(1_000)) {
      await DeveloperScreen.back.tap()
      continue
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Neither AccountSetup nor Developer appeared at 4.0.3 cold start. On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}

/**
 * Onboard on the 4.0.3 binary to its unverified resting state — the Setup Steps screen — creating
 * `pin`. The 4.0.3 counterpart of `skipToHome`; there is no verification prompt to skip.
 */
export async function onboardOnV403(pin: string = TEST_PIN): Promise<void> {
  await reachAccountSetup()
  await AccountSetupScreen.tap('primary')

  await SetupTypesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SetupTypesScreen.link('myOwnId')
  await SetupTypesScreen.tapWhenEnabled('primary')

  // The last carousel page's Next navigates on to the privacy policy.
  await IntroCarouselScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  for (let page = 0; page < MAX_CAROUSEL_PAGES; page++) {
    if (await PrivacyPolicyScreen.isPresent(1_000)) break
    await IntroCarouselScreen.tap('primary')
  }
  await PrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await PrivacyPolicyScreen.tap('primary')

  await OptInAnalyticsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await OptInAnalyticsScreen.tap('secondary')

  // The terms render from a backend fetch; accept enables once loaded.
  await TermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await TermsOfUseScreen.tapWhenEnabled('primary')

  await NotificationsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await NotificationsScreen.tap('primary')
  const secured = await acceptSystemAlertsUntil(() => SecureAppScreen.isPresent(1_000), {
    timeoutMs: Timeouts.SCREEN_TRANSITION,
  })
  if (!secured) {
    throw new Error(`SecureApp never appeared after notifications. On screen: ${await describeCurrentScreen()}`)
  }
  await SecureAppScreen.tap('primary')

  await CreatePinScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await CreatePinScreen.fill('pin', pin)
  await CreatePinScreen.fill('confirmPin', pin)
  await CreatePinScreen.link('understand')
  await CreatePinScreen.tapWhenEnabled('primary')

  // PIN completion finishes onboarding directly, landing on Setup Steps.
  await SetupStepsScreen.expectVisible(Timeouts.COLD_START)
}

/** Open Settings on 4.0.3 via the Setup Steps header menu — no tab bar exists pre-verification. */
export async function openSettingsV403(): Promise<void> {
  await SetupStepsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SetupStepsScreen.tap('menu')
}
