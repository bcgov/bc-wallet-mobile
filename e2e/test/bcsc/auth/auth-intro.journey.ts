import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { relaunchApp, selectAccountLandingIfPresent, unlockWithPin } from '../../../src/flows/auth.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { openDeveloperMenuFromSettings, scrollToSettingsVersionFooter } from '../../../src/helpers/developer.js'
import { AccountLandingScreen, AuthSettingsScreen } from '../../../src/screens/auth.js'
import { DeveloperScreen } from '../../../src/screens/developer.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import { OnboardingIntroScreen } from '../../../src/screens/onboarding.js'

/**
 * Auth journey: the returning-user welcome intro (AuthIntro).
 *
 * AuthStack opens on `AuthIntro` instead of `AccountLanding` when `hasSeenOnboardingIntro` was never
 * recorded. Onboarding sets that flag on its very first tap, so the only way to observe the variant
 * is the Developer menu's "Reset Welcome Intro", reached PRE-auth from AccountLanding's header menu.
 *
 * Separate from `auth-unlock.journey.ts` on purpose: this depends on the hidden developer-menu
 * trigger, and a failure there must not take the core unlock spine down with it.
 */

/** The dev tools persist without awaiting the write; let it flush before terminating. */
const PREFERENCE_WRITE_SETTLE_MS = 1_000

describe('Auth journey: returning-user intro', () => {
  it('onboards and skips to unverified Home', async () => {
    await skipToHome()
  })

  it('opens the pre-authentication settings from AccountLanding', async () => {
    await relaunchApp()
    await selectAccountLandingIfPresent()
    // Header-left menu → AuthSettings (pre-auth, so ContactUs is the arrival marker).
    await AccountLandingScreen.tap('menu')
    await AuthSettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('reveals the developer menu and resets the welcome intro', async () => {
    await openDeveloperMenuFromSettings()
    await DeveloperScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await DeveloperScreen.link('resetOnboardingIntro')
    await driver.pause(PREFERENCE_WRITE_SETTLE_MS)
    // The row's own readout has no testID; the next checkpoint's intro is the observable effect.
    // AuthStack sets no `headerBackTestID`, so this screen is left by relaunching.
  })

  it('shows the welcome intro on the next launch and slides on to AccountLanding', async () => {
    // AuthStack picks its initial route at mount, so the reset only lands on a fresh launch.
    await relaunchApp()
    await OnboardingIntroScreen.expectVisible(Timeouts.APP_LAUNCH)
    // Same component as the onboarding intro — what identifies the variant is where Continue goes:
    // it REPLACES itself with AccountLanding, where onboarding pushes the privacy policy.
    await OnboardingIntroScreen.tap('primary')
    await AccountLandingScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('records the intro as seen so later launches go straight to AccountLanding', async () => {
    await relaunchApp()
    await AccountLandingScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('unlocks to Home', async () => {
    await unlockWithPin(TEST_PIN)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('leaves the developer menu row exposed in settings', async () => {
    // Counterpart of the detours journey's "hidden on a default install" assertion — the preference
    // is persisted, so the row is now offered on every settings surface.
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The row sits at the foot of a list that outruns the default scroll hunt on small phones.
    await scrollToSettingsVersionFooter()
    await SettingsScreen.waitFor('developerMode', Timeouts.SCREEN_TRANSITION)
  })
})
