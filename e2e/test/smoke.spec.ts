import { annotate } from '../src/helpers/sauce'
import OnboardingScreen from '../src/screens/OnboardingScreen'
import { getVariantConfig } from '../src/variant'

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await annotate(`Variant: ${variant.name}`)
    await OnboardingScreen.waitForDisplayed(30_000)
  })

  it('should complete initial onboarding navigation', async () => {
    await OnboardingScreen.completeOnboarding()
  })
})
