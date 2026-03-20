import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import { BaseScreen } from '../../src/screens/BaseScreen.js'
import { TestIDs } from '../../src/testIDs.js'
import { getVariantConfig } from '../../src/variant.js'

const AccountSetup = new BaseScreen(TestIDs.AccountSetup)
const SetupTypes = new BaseScreen(TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(TestIDs.IntroCarousel)

describe('App Launch', () => {
  const variant = getVariantConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetup.waitFor('AddAccount')
  })

  it('should complete initial onboarding navigation', async () => {
    await AccountSetup.tap('AddAccount')
    await SetupTypes.waitFor('Continue', 20_000)
    await SetupTypes.tap('Continue')
    await IntroCarousel.waitFor('CarouselNext', 20_000)
    await IntroCarousel.tap('CarouselNext')
  })
})
