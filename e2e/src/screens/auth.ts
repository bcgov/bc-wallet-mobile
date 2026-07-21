import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Auth (returning-user unlock) stack screen objects.
 *
 * Cold-start model: `didAuthenticate` is in-memory, so every launch of an onboarded user goes
 * AccountLanding → EnterPIN → Home. AuthIntro (the returning-user copy of the onboarding intro,
 * shown only when `hasSeenOnboardingIntro` was never recorded) reuses `OnboardingIntroScreen`
 * from `./onboarding.js` — it is the same component.
 */

const auth = TestIds.auth

/** Returning-user landing. `primary` (Unlock) → EnterPIN. */
export const AccountLandingScreen = defineScreen({
  self: bcsc(auth.accountLanding.unlock),
  primary: bcsc(auth.accountLanding.unlock),
})

/**
 * Existing-PIN entry (`EnterPIN`). Filling all 6 digits auto-submits; `primary` (Continue) is the
 * manual fallback when auto-submit doesn't fire.
 */
export const EnterPINScreen = defineScreen({
  self: bcsc(auth.enterPin.pin),
  primary: bcsc(auth.enterPin.continue),
  inputs: {
    pin: bcsc(auth.enterPin.pin),
  },
  links: {
    getHelp: bcsc(auth.enterPin.getHelp),
    pinVisibility: bcsc(auth.enterPin.pinVisibility),
  },
})
