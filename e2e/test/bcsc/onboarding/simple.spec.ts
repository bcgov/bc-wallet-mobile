import { acceptLocalNetworkPermissionIfPresent } from '../../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../../src/helpers/notifications.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../src/testIDs.js'

const AccountSetup = new BaseScreen(TestIDs.AccountSetup)
const SetupTypes = new BaseScreen(TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(TestIDs.IntroCarousel)
const PrivacyPolicy = new BaseScreen(TestIDs.PrivacyPolicy)
const OptInAnalytics = new BaseScreen(TestIDs.OptInAnalytics)
const TermsOfUse = new BaseScreen(TestIDs.TermsOfUse)
const Notifications = new BaseScreen(TestIDs.Notifications)
const SecureApp = new BaseScreen(TestIDs.SecureApp)
const CreatePIN = new BaseScreen(TestIDs.CreatePIN)

describe('Onboarding', () => {
  it('should display the Account Setup screen and tap Add Account', async () => {
    await acceptLocalNetworkPermissionIfPresent()
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
    await TermsOfUse.tap('AcceptAndContinue')
  })

  it('should navigate through the Notifications screen', async () => {
    await Notifications.waitFor('Continue')
    await Notifications.tap('Continue')
    await acceptNotificationPermissionIfPresent()
  })

  it('should navigate through the Secure App screen', async () => {
    await SecureApp.waitFor('PinAuth')
    await SecureApp.tap('PinAuth')
  })

  it('should navigate through the Create PIN screen', async () => {
    await CreatePIN.waitFor('PINInput1')
    await CreatePIN.tap('PINInput1VisibilityButton')
    await CreatePIN.tap('PINInput2VisibilityButton')
    await CreatePIN.type('PINInput1', '123456')
    await CreatePIN.type('PINInput2', '123456')
    await CreatePIN.tap('IUnderstand')
    await CreatePIN.tap('Continue')
  })
})
