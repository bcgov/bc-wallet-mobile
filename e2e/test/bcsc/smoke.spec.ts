import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import AccountSetupE2EScreen from '../../src/screens/bcsc/onboarding/AccountSetup.e2e.js'
import IntroCarouselE2EScreen from '../../src/screens/bcsc/onboarding/IntroCarousel.e2e.js'
import SetupTypesE2EScreen from '../../src/screens/bcsc/onboarding/SetupTypes.e2e.js'
import { getVariantConfig } from '../../src/variant.js'

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetupE2EScreen.waitForDisplayed(60_000)
  })

  it('should complete initial onboarding navigation', async () => {
    await AccountSetupE2EScreen.tapAddAccount()
    await SetupTypesE2EScreen.waitForDisplayed()
    await SetupTypesE2EScreen.tapContinue()
    await IntroCarouselE2EScreen.waitForDisplayed()
    await IntroCarouselE2EScreen.swipeThroughAll()
  })
})
