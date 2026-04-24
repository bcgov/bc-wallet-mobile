/**
 * Onboarding Interaction Sweep: runs the full onboarding flow and exercises
 * every secondary interaction the happy-path suite skips — account-transfer
 * detour, setup-type radio options, carousel back + external "Where to use"
 * link, privacy-policy learn-more detour, analytics decline, notifications
 * help detour + permission denial, secure-app learn-more detour, and
 * create-PIN visibility toggles. Ends at SetupSteps (verify phase ready).
 *
 * Imported by `full-regression/interaction-sweep.spec.ts`.
 */
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { getCurrentAppId } from '../../../src/helpers/deep-link.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const SetupTypes = new BaseScreen(BCSC_TestIDs.SetupTypes)
const IntroCarousel = new BaseScreen(BCSC_TestIDs.IntroCarousel)
const PrivacyPolicy = new BaseScreen(BCSC_TestIDs.PrivacyPolicy)
const OptInAnalytics = new BaseScreen(BCSC_TestIDs.OptInAnalytics)
const TermsOfUse = new BaseScreen(BCSC_TestIDs.TermsOfUse)
const Notifications = new BaseScreen(BCSC_TestIDs.Notifications)
const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const CreatePIN = new BaseScreen(BCSC_TestIDs.CreatePIN)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)

describe('Add Account', () => {
  it('should tap Add Account', async () => {
    await AccountSetup.waitFor('AddAccount', Timeouts.appLaunch)
    await AccountSetup.tap('AddAccount')
  })
})

describe('Setup Type Interaction', () => {
  it('should select radio options on the Setup Types screen', async () => {
    await SetupTypes.waitFor('SomeoneElseIdRadioGroup')
    await SetupTypes.tap('SomeoneElseIdRadioGroup')
    await SetupTypes.waitFor('OtherPersonPresentRadioGroupNoOption')
    await SetupTypes.tap('OtherPersonPresentRadioGroupNoOption')
    await SetupTypes.waitFor('OtherPersonPresentRadioGroupYesOption')
    await SetupTypes.tap('OtherPersonPresentRadioGroupYesOption')
  })

  it('should continue past Setup Types', async () => {
    await SetupTypes.tap('Continue')
  })
})

describe('Intro Carousel Interactions', () => {
  it('should open Where to use in the browser and return to the carousel', async () => {
    await IntroCarousel.waitFor('CarouselNext')
    const appId = await getCurrentAppId()
    await IntroCarousel.tap('WhereToUseButton')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
    await IntroCarousel.waitFor('CarouselNext')
  })

  it('should navigate forward, back, then complete the carousel', async () => {
    await IntroCarousel.tap('CarouselNext')
    await IntroCarousel.waitFor('CarouselBack')
    await IntroCarousel.tap('CarouselBack')
    await IntroCarousel.tap('CarouselNext')
    await IntroCarousel.tap('CarouselNext')
    await IntroCarousel.tap('CarouselNext')
  })
})

describe('Privacy Policy Page', () => {
  it('should open the BC login service in the browser then return and carry onwards', async () => {
    await PrivacyPolicy.waitFor('Link')
    const appId = await getCurrentAppId()
    await PrivacyPolicy.tap('Link')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
  })

  it('should open learn more web view then return and carry onwards', async () => {
    await PrivacyPolicy.waitFor('LearnMore')
    await PrivacyPolicy.tap('LearnMore')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await PrivacyPolicy.waitFor('Continue')
    await PrivacyPolicy.tap('Continue')
  })
})

describe('Opt-In Analytics Decline', () => {
  it('should open learn more web view then return and carry onwards', async () => {
    await OptInAnalytics.waitFor('LearnMore')
    await OptInAnalytics.tap('LearnMore')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('should decline analytics opt-in', async () => {
    await OptInAnalytics.waitFor('Decline')
    await OptInAnalytics.tap('Decline')
  })
})

describe('Terms of Use', () => {
  it('should accept the terms of use', async () => {
    await TermsOfUse.waitFor('AcceptAndContinue')
    await TermsOfUse.tapWhenEnabled('AcceptAndContinue')
  })
})

describe('Notifications Interactions', () => {
  it('should tap Help and return from the WebView', async () => {
    await Notifications.waitFor('Help')
    await Notifications.tap('Help')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('should open the settings and navigate back', async () => {
    await Notifications.waitFor('OpenSettings')
    const appId = await getCurrentAppId()
    await Notifications.tap('OpenSettings')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)
  })

  it('should continue without notifications', async () => {
    await Notifications.waitFor('ContinueWithoutNotifications')
    await Notifications.tap('ContinueWithoutNotifications')
  })
})

describe('Secure App Learn More Detour', () => {
  it('should tap Learn More and return from the WebView', async () => {
    await SecureApp.waitFor('LearnMore')
    await SecureApp.tap('LearnMore')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('should select PIN auth on the Secure App screen', async () => {
    await SecureApp.waitFor('PinAuth')
    await SecureApp.tap('PinAuth')
  })
})

describe('PIN Authentication with Visibility Toggles', () => {
  it('should toggle PIN visibility on both inputs and create a PIN', async () => {
    await CreatePIN.waitFor('PINInput1')
    // Toggle each input on then off so both masked and visible states render.
    await CreatePIN.tap('PINInput1VisibilityButton')
    await CreatePIN.tap('PINInput1VisibilityButton')
    await CreatePIN.tap('PINInput2VisibilityButton')
    await CreatePIN.tap('PINInput2VisibilityButton')
    await CreatePIN.type('PINInput1', TEST_PIN)
    await CreatePIN.type('PINInput2', TEST_PIN)
    await CreatePIN.tap('IUnderstand')
    await CreatePIN.tap('Continue')
  })

  it('should land on Setup Steps after PIN creation', async () => {
    await SetupSteps.waitFor('Step1', Timeouts.appLaunch)
  })
})
