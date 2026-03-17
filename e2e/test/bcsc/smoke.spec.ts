import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import AccountSetupScreen from '../../src/screens/bcsc/onboarding/AccountSetupScreen.js'
import IntroCarouselScreen from '../../src/screens/bcsc/onboarding/IntroCarouselScreen.js'
import SetupTypesScreen from '../../src/screens/bcsc/onboarding/SetupTypesScreen.js'
import { getVariantConfig } from '../../src/variant.js'

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetupScreen.waitForDisplayed(60_000)
  })

  it('should complete initial onboarding navigation', async () => {
    await AccountSetupScreen.tapAddAccount()
    await SetupTypesScreen.waitForDisplayed()
    await SetupTypesScreen.tapContinue()
    await IntroCarouselScreen.waitForDisplayed()
    await IntroCarouselScreen.swipeThroughAll()
  })
})
