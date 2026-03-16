import { acceptLocalNetworkPermissionIfPresent } from '../src/helpers/iosPermissions.js'
import { annotate } from '../src/helpers/sauce.js'
import OnboardingScreen from '../src/screens/OnboardingScreen.js'
import { getVariantConfig } from '../src/variant.js'

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await OnboardingScreen.waitForDisplayed(30_000)
  })

  it('should complete initial onboarding navigation', async () => {
    await OnboardingScreen.completeOnboarding()
  })
})
