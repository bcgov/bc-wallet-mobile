import { acceptLocalNetworkPermissionIfPresent } from '../../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../../src/helpers/notifications.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { TestIDs } from '../../../src/testIDs.js'

const AccountSetupE2EScreen = new BaseScreen()
const SetupTypesE2EScreen = new BaseScreen()
const IntroCarouselE2EScreen = new BaseScreen()
const PrivacyPolicyE2EScreen = new BaseScreen()
const OptInAnalyticsE2EScreen = new BaseScreen()
const TermsOfUseE2EScreen = new BaseScreen()
const NotificationsE2EScreen = new BaseScreen()
const SecureAppE2EScreen = new BaseScreen()
const CreatePINE2EScreen = new BaseScreen()

const {
  AccountSetup,
  SetupTypes,
  IntroCarousel,
  PrivacyPolicy,
  OptInAnalytics,
  TermsOfUse,
  Notifications,
  SecureApp,
  CreatePIN,
} = TestIDs

describe('Onboarding', () => {
  it('should display the Account Setup screen and tap Add Account', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await AccountSetupE2EScreen.waitForDisplayed(60_000, AccountSetup.AddAccount)
    await AccountSetupE2EScreen.tapByTestId(AccountSetup.AddAccount)
  })

  it('should navigate through the Setup Types screen', async () => {
    await SetupTypesE2EScreen.waitForDisplayed(20_000, SetupTypes.Continue)
    await SetupTypesE2EScreen.tapByTestId(SetupTypes.Continue)
  })

  it('should navigate through the Intro Carousel screen', async () => {
    await IntroCarouselE2EScreen.waitForDisplayed(20_000, IntroCarousel.CarouselNext)
    await IntroCarouselE2EScreen.tapByTestId(IntroCarousel.CarouselNext)
    await IntroCarouselE2EScreen.tapByTestId(IntroCarousel.CarouselNext)
    await IntroCarouselE2EScreen.tapByTestId(IntroCarousel.CarouselNext)
  })

  it('should navigate through the Privacy Policy screen', async () => {
    await PrivacyPolicyE2EScreen.waitForDisplayed(20_000, PrivacyPolicy.Continue)
    await PrivacyPolicyE2EScreen.tapByTestId(PrivacyPolicy.Continue)
  })

  it('should navigate through the Opt In Analytics screen', async () => {
    await OptInAnalyticsE2EScreen.waitForDisplayed(20_000, OptInAnalytics.Accept)
    await OptInAnalyticsE2EScreen.tapByTestId(OptInAnalytics.Accept)
  })

  it('should navigate through the Terms of Use screen', async () => {
    await TermsOfUseE2EScreen.waitForDisplayed(20_000, TermsOfUse.AcceptAndContinue)
    await TermsOfUseE2EScreen.tapByTestId(TermsOfUse.AcceptAndContinue)
  })

  it('should navigate through the Notifications screen', async () => {
    await NotificationsE2EScreen.waitForDisplayed(20_000, Notifications.Continue)
    await NotificationsE2EScreen.tapByTestId(Notifications.Continue)
    await acceptNotificationPermissionIfPresent()
  })

  it('should navigate through the Secure App screen', async () => {
    await SecureAppE2EScreen.waitForDisplayed(20_000, SecureApp.PinAuth)
    await SecureAppE2EScreen.tapByTestId(SecureApp.PinAuth)
  })

  it('should navigate through the Create PIN screen', async () => {
    await CreatePINE2EScreen.waitForDisplayed(20_000, CreatePIN.PINInput1)
    await CreatePINE2EScreen.tapByTestId(CreatePIN.PINInput1VisibilityButton)
    await CreatePINE2EScreen.tapByTestId(CreatePIN.PINInput2VisibilityButton)
    await CreatePINE2EScreen.enterText(CreatePIN.PINInput1, '123456')
    await CreatePINE2EScreen.enterText(CreatePIN.PINInput2, '123456')
    await CreatePINE2EScreen.tapByTestId(CreatePIN.IUnderstand)
    await CreatePINE2EScreen.tapByTestId(CreatePIN.Continue)
  })
})
