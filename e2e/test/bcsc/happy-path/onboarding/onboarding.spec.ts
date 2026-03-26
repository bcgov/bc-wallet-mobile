import { acceptLocalNetworkPermissionIfPresent } from '../../../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../../../src/helpers/notifications.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const SetupTypes = new BaseScreen(BCSC_TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(BCSC_TestIDs.IntroCarousel)
const PrivacyPolicy = new BaseScreen(BCSC_TestIDs.PrivacyPolicy)
const OptInAnalytics = new BaseScreen(BCSC_TestIDs.OptInAnalytics)
const TermsOfUse = new BaseScreen(BCSC_TestIDs.TermsOfUse)
const Notifications = new BaseScreen(BCSC_TestIDs.Notifications)
const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const CreatePIN = new BaseScreen(BCSC_TestIDs.CreatePIN)

describe('Onboarding', () => {
  it('should display the Account Setup screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await AccountSetup.waitFor('AddAccount', 20000)
  })

  it('should tap Add Account', async () => {
    await AccountSetup.waitFor('AddAccount')
    await AccountSetup.tap('AddAccount')
  })

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

  it('should navigate through the Notifications screen', async () => {
    await Notifications.waitFor('Continue')
    await Notifications.tap('Continue')
    await acceptNotificationPermissionIfPresent()
  })

  it('should select Pin Auth on the Secure App screen', async () => {
    await SecureApp.waitFor('PinAuth')
    await SecureApp.tap('PinAuth')
  })

  it('should create a PIN', async () => {
    await CreatePIN.waitFor('PINInput1')
    await CreatePIN.tap('PINInput1VisibilityButton')
    await CreatePIN.tap('PINInput2VisibilityButton')
    await CreatePIN.type('PINInput1', '123456')
    await CreatePIN.type('PINInput2', '123456')
    await CreatePIN.tap('IUnderstand')
    await CreatePIN.tap('Continue')
  })
})
