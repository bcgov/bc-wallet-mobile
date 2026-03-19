import { acceptLocalNetworkPermissionIfPresent } from '../../../src/helpers/iosPermissions.js'
import { acceptNotificationPermissionIfPresent } from '../../../src/helpers/notifications.js'
import {
  AccountSetupE2EScreen,
  CreatePINE2EScreen,
  IntroCarouselE2EScreen,
  NotificationsE2EScreen,
  OptInAnalyticsE2EScreen,
  PrivacyPolicyE2EScreen,
  SecureAppE2EScreen,
  SetupTypesE2EScreen,
  TermsOfUseE2EScreen,
} from '../../../src/screens/bcsc/onboarding/index.js'

describe('Onboarding', () => {
  it('should display the Account Setup screen and tap Add Account', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await AccountSetupE2EScreen.waitForDisplayed(60_000)
    await AccountSetupE2EScreen.tapAddAccount()
  })

  it('should navigate through the Setup Types screen', async () => {
    await SetupTypesE2EScreen.waitForDisplayed()
    await SetupTypesE2EScreen.tapContinue()
  })

  it('should navigate through the Intro Carousel screen', async () => {
    await IntroCarouselE2EScreen.waitForDisplayed()
    await IntroCarouselE2EScreen.tapThroughAll()
  })

  it('should navigate through the Privacy Policy screen', async () => {
    await PrivacyPolicyE2EScreen.waitForDisplayed()
    await PrivacyPolicyE2EScreen.tapContinue()
  })

  it('should navigate through the Opt In Analytics screen', async () => {
    await OptInAnalyticsE2EScreen.waitForDisplayed()
    await OptInAnalyticsE2EScreen.tapAccept()
  })

  it('should navigate through the Terms of Use screen', async () => {
    await TermsOfUseE2EScreen.waitForDisplayed()
    await TermsOfUseE2EScreen.tapAcceptAndContinue()
  })

  it('should navigate through the Notifications screen', async () => {
    await NotificationsE2EScreen.waitForDisplayed()
    await NotificationsE2EScreen.tapContinue()
    await acceptNotificationPermissionIfPresent()
  })

  it('should navigate through the Secure App screen', async () => {
    await SecureAppE2EScreen.waitForDisplayed()
    await SecureAppE2EScreen.tapPinAuth()
  })

  it('should navigate through the Create PIN screen', async () => {
    await CreatePINE2EScreen.waitForDisplayed()
    await CreatePINE2EScreen.tapVisibilityButtons()
    await CreatePINE2EScreen.enterPIN1('123456')
    await CreatePINE2EScreen.enterPIN2('123456')
    await CreatePINE2EScreen.tapIUnderstand()
    await CreatePINE2EScreen.tapContinue()
  })
})
