import { Timeouts } from '../../src/constants.js'
import { getE2EConfig } from '../../src/e2eConfig.js'
import { annotate } from '../../src/helpers/sauce.js'
import { BCWalletOnboardingScreen, PrefaceScreen } from '../../src/screens/bcwallet.js'

/**
 * BC Wallet smoke: prove the app cold-starts and the Preface → onboarding intro navigates. Drives the
 * bifold intro screens via the action-based DSL (`screens/bcwallet.ts`), so a renamed testID is a
 * one-line descriptor edit rather than spec churn.
 */
describe('BC Wallet smoke: app launch + intro', () => {
  const { variant } = getE2EConfig()

  it('cold-starts on the Preface screen', async () => {
    await annotate(`Variant: ${variant}`)
    await PrefaceScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('accepts the Preface and continues', async () => {
    await PrefaceScreen.link('iAgree')
    await PrefaceScreen.waitFor('continue', 20_000)
    await PrefaceScreen.link('continue')
  })

  it('pages through onboarding to Get Started', async () => {
    await BCWalletOnboardingScreen.waitFor('next')
    await BCWalletOnboardingScreen.link('next')
    await BCWalletOnboardingScreen.link('next')
    await BCWalletOnboardingScreen.link('getStarted')
  })
})
