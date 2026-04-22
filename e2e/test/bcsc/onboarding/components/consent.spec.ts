import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupTypes = new BaseScreen(BCSC_TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(BCSC_TestIDs.IntroCarousel)
const PrivacyPolicy = new BaseScreen(BCSC_TestIDs.PrivacyPolicy)
const OptInAnalytics = new BaseScreen(BCSC_TestIDs.OptInAnalytics)
const TermsOfUse = new BaseScreen(BCSC_TestIDs.TermsOfUse)

describe('Consent', () => {
  it('should navigate through the Setup Types screen', async () => {
    await SetupTypes.waitFor('Continue')
    await SetupTypes.tap('Continue')
  })

  it('should navigate through the Intro Carousel screen', async () => {
    await IntroCarousel.waitFor('CarouselNext')
    await IntroCarousel.tap('CarouselNext')
    await IntroCarousel.tap('CarouselNext')
    await IntroCarousel.tap('CarouselNext')
  })

  it('should navigate through the Privacy Policy screen', async () => {
    await PrivacyPolicy.waitFor('Continue')
    await PrivacyPolicy.tap('Continue')
  })

  it('should navigate through the Opt In Analytics screen', async () => {
    await OptInAnalytics.waitFor('Accept')
    await OptInAnalytics.tap('Accept')
  })

  it('should navigate through the Terms of Use screen', async () => {
    await TermsOfUse.waitFor('AcceptAndContinue')
    await TermsOfUse.tapWhenEnabled('AcceptAndContinue')
  })
})
