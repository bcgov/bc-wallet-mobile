import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../src/helpers/notifications.js'
import { annotate } from '../../src/helpers/sauce.js'
import AccountSetupE2EScreen from '../../src/screens/bcsc/onboarding/AccountSetup.e2e.js'
import CreatePINE2EScreen from '../../src/screens/bcsc/onboarding/CreatePIN.e2e.js'
import IntroCarouselE2EScreen from '../../src/screens/bcsc/onboarding/IntroCarousel.e2e.js'
import NotificationsE2EScreen from '../../src/screens/bcsc/onboarding/Notifications.e2e.js'
import OptInAnalyticsE2EScreen from '../../src/screens/bcsc/onboarding/OptInAnalytics.e2e.js'
import PrivacyPolicyE2EScreen from '../../src/screens/bcsc/onboarding/PrivacyPolicy.e2e.js'
import SecureAppE2EScreen from '../../src/screens/bcsc/onboarding/SecureApp.e2e.js'
import SetupTypesE2EScreen from '../../src/screens/bcsc/onboarding/SetupTypes.e2e.js'
import TermsOfUseE2EScreen from '../../src/screens/bcsc/onboarding/TermsOfUse.e2e.js'
import { getVariantConfig } from '../../src/variant.js'

describe('Onboarding', () => {
  const variant = getVariantConfig()

  it('should display the Account Setup screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetupE2EScreen.waitForDisplayed(60_000)
  })

  it('should navigate to the Setup Types screen', async () => {
    await AccountSetupE2EScreen.tapAddAccount()
    await SetupTypesE2EScreen.waitForDisplayed()
    await SetupTypesE2EScreen.tapContinue()
  })

  it('should navigate to the Intro Carousel screen', async () => {
    await IntroCarouselE2EScreen.waitForDisplayed()
    await IntroCarouselE2EScreen.tapThroughAll()
  })

  it('should navigate to the Privacy Policy screen', async () => {
    await PrivacyPolicyE2EScreen.waitForDisplayed()
    await PrivacyPolicyE2EScreen.tapContinue()
  })

  it('should navigate to the Opt In Analytics screen', async () => {
    await OptInAnalyticsE2EScreen.waitForDisplayed()
    await OptInAnalyticsE2EScreen.tapAccept()
  })

  it('should navigate to the Terms of Use screen', async () => {
    await TermsOfUseE2EScreen.waitForDisplayed()
    await TermsOfUseE2EScreen.tapAcceptAndContinue()
  })

  it('should navigate to the Notifications screen', async () => {
    await NotificationsE2EScreen.waitForDisplayed()
    await NotificationsE2EScreen.tapContinue()
    await acceptNotificationPermissionIfPresent()
  })

  it('should navigate to the Secure App screen', async () => {
    await SecureAppE2EScreen.waitForDisplayed()
    await SecureAppE2EScreen.tapPinAuth()
  })

  it('should navigate to the Create PIN screen', async () => {
    await CreatePINE2EScreen.waitForDisplayed()
    await CreatePINE2EScreen.tapVisibilityButtons()
    await CreatePINE2EScreen.enterPIN1('123456')
    await CreatePINE2EScreen.enterPIN2('123456')
    await CreatePINE2EScreen.tapIUnderstand()
    // Brief pause for checkbox state to propagate and Continue to become enabled
    // await new Promise((resolve) => setTimeout(resolve, 300))
    await CreatePINE2EScreen.tapContinue()
  })
})
