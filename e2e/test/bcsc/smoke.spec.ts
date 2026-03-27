import { getE2EConfig } from '../../src/e2eConfig.js'
import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import { BaseScreen } from '../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const SetupTypes = new BaseScreen(BCSC_TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(BCSC_TestIDs.IntroCarousel)

describe('App Launch', () => {
  const { variant } = getE2EConfig()

  it('should launch and display the first screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant}`)
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
