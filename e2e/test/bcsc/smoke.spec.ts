import { Timeouts } from '../../src/constants.js'
import { getE2EConfig } from '../../src/e2eConfig.js'
import { annotate } from '../../src/helpers/sauce.js'
import {
  OnboardingIntroScreen,
  OnboardingPrivacyPolicyScreen,
  OnboardingTermsOfUseScreen,
} from '../../src/screens/onboarding.js'

/**
 * BCSC smoke: prove the app cold-starts and the first onboarding screens navigate.
 *
 * v4.1 changed the launch flow — a fresh install now opens on `OnboardingIntro`, not the old
 * AccountSetup screen (which moved into `VerifyStack`). The previous smoke waited for `AddAccount`
 * on launch and so failed on every PR. This spec targets the real v4.1 entry flow.
 *
 * It also seeds the new action-based screen-object DSL (FND-1): specs drive screens by semantic
 * role (`expectVisible()`, `tap('primary')`) via per-stack descriptors in `src/screens/onboarding.ts`,
 * so a renamed testID is a one-line descriptor edit rather than spec churn.
 */
describe('BCSC smoke: app launch + onboarding entry', () => {
  const { variant } = getE2EConfig()

  it('cold-starts on the onboarding intro screen', async () => {
    await annotate(`Variant: ${variant}`)
    await OnboardingIntroScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('advances Intro → Privacy Policy → Terms of Use', async () => {
    // Self-contained: assert the precondition rather than depending on the previous `it`'s end state.
    await OnboardingIntroScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await OnboardingIntroScreen.tap('primary')
    await OnboardingPrivacyPolicyScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    await OnboardingPrivacyPolicyScreen.tap('primary')
    await OnboardingTermsOfUseScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
