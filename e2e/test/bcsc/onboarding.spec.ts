import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../src/helpers/notifications.js'
import { annotate } from '../../src/helpers/sauce.js'
import AccountSetupScreen from '../../src/screens/bcsc/onboarding/AccountSetupScreen.js'
import CreatePINScreen from '../../src/screens/bcsc/onboarding/CreatePINScreen.js'
import IntroCarouselScreen from '../../src/screens/bcsc/onboarding/IntroCarouselScreen.js'
import NotificationsScreen from '../../src/screens/bcsc/onboarding/NotificationsScreen.js'
import OptInAnalyticsScreen from '../../src/screens/bcsc/onboarding/OptInAnalyticsScreen.js'
import PrivacyPolicyScreen from '../../src/screens/bcsc/onboarding/PrivacyPolicyScreen.js'
import SecureAppScreen from '../../src/screens/bcsc/onboarding/SecureAppScreen.js'
import SetupTypesScreen from '../../src/screens/bcsc/onboarding/SetupTypesScreen.js'
import TermsOfUseScreen from '../../src/screens/bcsc/onboarding/TermsOfUseScreen.js'
import { getVariantConfig } from '../../src/variant.js'

describe('Onboarding', () => {
  const variant = getVariantConfig()

  it('should display the Account Setup screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant.name}`)
    await AccountSetupScreen.waitForDisplayed(60_000)
  })

  it('should navigate to the Setup Types screen', async () => {
    await AccountSetupScreen.tapAddAccount()
    await SetupTypesScreen.waitForDisplayed()
    await SetupTypesScreen.tapContinue()
  })

  it('should navigate to the Intro Carousel screen', async () => {
    await IntroCarouselScreen.waitForDisplayed()
    await IntroCarouselScreen.tapThroughAll()
  })

  it('should navigate to the Privacy Policy screen', async () => {
    await PrivacyPolicyScreen.waitForDisplayed()
    await PrivacyPolicyScreen.tapContinue()
  })

  it('should navigate to the Opt In Analytics screen', async () => {
    await OptInAnalyticsScreen.waitForDisplayed()
    await OptInAnalyticsScreen.tapAccept()
  })

  it('should navigate to the Terms of Use screen', async () => {
    await TermsOfUseScreen.waitForDisplayed()
    await TermsOfUseScreen.tapAcceptAndContinue()
  })

  it('should navigate to the Notifications screen', async () => {
    await NotificationsScreen.waitForDisplayed()
    await NotificationsScreen.tapContinue()
    await acceptNotificationPermissionIfPresent()
  })

  it('should navigate to the Secure App screen', async () => {
    await SecureAppScreen.waitForDisplayed()
    await SecureAppScreen.tapPinAuth()
  })

  it('should navigate to the Create PIN screen', async () => {
    await CreatePINScreen.waitForDisplayed()
    await CreatePINScreen.tapVisibilityButtons()
    await CreatePINScreen.enterPIN1('123456')
    await CreatePINScreen.enterPIN2('123456')
    await CreatePINScreen.tapIUnderstand()
    // Brief pause for checkbox state to propagate and Continue to become enabled
    // await new Promise((resolve) => setTimeout(resolve, 300))
    await CreatePINScreen.tapContinue()
  })
})
