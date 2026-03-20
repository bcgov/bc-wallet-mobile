import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import { BaseScreen } from '../../src/screens/BaseScreen.js'
import { TestIDs } from '../../src/testIDs.js'
import { getVariantConfig } from '../../src/variant.js'

const AccountSetupE2EScreen = new BaseScreen()
const SetupTypesE2EScreen = new BaseScreen()
const IntroCarouselE2EScreen = new BaseScreen()

const { AccountSetup, SetupTypes, IntroCarousel } = TestIDs

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetupE2EScreen.waitForDisplayed(60_000, AccountSetup.AddAccount)
  })

  it('should complete initial onboarding navigation', async () => {
    await AccountSetupE2EScreen.tapByTestId(AccountSetup.AddAccount)
    await SetupTypesE2EScreen.waitForDisplayed(20_000, SetupTypes.Continue)
    await SetupTypesE2EScreen.tapByTestId(SetupTypes.Continue)
    await IntroCarouselE2EScreen.waitForDisplayed(20_000, IntroCarousel.CarouselNext)
    await IntroCarouselE2EScreen.tapByTestId(IntroCarousel.CarouselNext)
  })
})
