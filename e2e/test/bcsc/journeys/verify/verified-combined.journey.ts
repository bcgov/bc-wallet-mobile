import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../../src/constants.js'
import { selectAccountLandingIfPresent } from '../../../../src/flows/auth.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  reachVerificationMethod,
  startVerification,
} from '../../../../src/flows/verify.js'
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { currentPlatform, dispatchDeepLink, getCurrentAppId } from '../../../../src/helpers/deep-link.js'
import { fetchPairingCode, fetchPairingDeepLink } from '../../../../src/helpers/pairing-code.js'
import { AccountLandingScreen, EnterPINScreen } from '../../../../src/screens/auth.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import {
  AccountDetailsScreen,
  ContactsScreen,
  EditNicknameScreen,
  ForgetPairingsScreen,
  HomeScreen,
  MainWebViewScreen,
  ManualPairingScreen,
  PairingConfirmationScreen,
  ServiceLoginScreen,
  ServicesScreen,
  SettingsScreen,
  TabBar,
  TransferQRDisplayScreen,
  TransferQRInformationScreen,
  WalletScreen,
  WhatAreContactsScreen,
} from '../../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/** Engine handle for text-based asserts on screens/elements that expose no testID (the ProfileCard name;
 *  the WhatAreContacts heading). */
const engine = new BaseScreen()
const NEW_NICKNAME = 'E2E Photo Account'
/** The WhatAreContacts info screen has no usable testID (its only one is an inline text Link that RN
 *  flattens), so arrival is asserted by its heading copy — `BCSC.Contacts.WhatAre.Title` (en). */
const WHAT_ARE_CONTACTS_TITLE = 'What are Contacts?'

/**
 * Verified journey: combined card. A combined card uses the same BCSC-photo authorize process as the
 * photo card and its authorize response carries a verified email, so it resumes straight to method
 * selection with NO email step. (The mandatory email step lives in the non-bcsc journey, where Skip is
 * hidden.)
 *
 * This is also the consolidation point for verified-state DETOURS — features that only need a verified
 * account, chained after verification so a SINGLE in-person approval validates them all: verified tab
 * nav + Services catalogue, the Contacts + Account Details surfaces, login-from-computer (minted pairing
 * code), login via deep link (warm then cold), the transferer "add another device" QR, and the
 * verified-only settings rows (nickname edit + forget pairings). The cold deep-link checkpoint
 * terminates + relaunches the app, so it re-authenticates before continuing.
 *
 * One ordered session: onboard → manual serial → birthdate (authorizeDevice) → method selection →
 * in-person → verified Home → tab nav + Services → Contacts (empty) + Account Details →
 * login-from-computer → deep-link login (warm, then cold) → transferer QR → nickname edit → forget
 * pairings. mocha bail isolates any failure to this file. (There is no manual sign-out control in the
 * app — the only re-lock is the inactivity auto-lock, covered by the settings journey.)
 */
describe('Verified journey: combined card', () => {
  before(() => {
    setTestUser(TestUsers.combined)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the combined serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('resumes to the verification method selection after authorizing', async () => {
    // Combined carries a card-provided email, so the flow skips EnterEmail and lands on method
    // selection directly (reachVerificationMethod tolerates either).
    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser(), { method: 'in-person' })
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('confirms verified state: the account profile row now appears in Settings', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(
      await SettingsScreen.isVisible('profile'),
      'the Settings Profile row is verified-gated and should be visible after verification'
    )
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // Verified tab navigation + Services content. Unverified users are bounced to MainVerifyPrompt on the
  // Services tap (see unverified-main.journey.ts); once verified, the Services tab opens the real catalogue.
  it('verified: the Services tab opens the catalogue instead of the verify prompt', async () => {
    await TabBar.link('services')
    await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // catalogue search field = loaded, not gated
  })

  it('verified: tab nav sweeps Services → Wallet → Home', async () => {
    await TabBar.link('wallet')
    // Identity verification issues no wallet credential, so the wallet is still the empty state; the
    // Credo agent boots for any authenticated user, so allow the cold-start budget.
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // Contacts is EMPTY for a verification-only account: the list shows only DIDComm connections
  // (non-mediator, Completed), and neither identity verification nor the BCSC service-login create one —
  // so it resolves to the empty state, whose sole control opens the WhatAreContacts info screen.
  // Reaching that button (ContactsScreen.self) IS the empty-state proof; it does not render once the
  // list is populated. (Seeding a real contact needs an out-of-band credential connection, which is out
  // of CI — the same camera/second-device constraint as QR scanning.)
  it('verified: opens Contacts (empty) and the What-Are-Contacts info screen', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('contacts') // verified-only Features row → Contacts (agent-ready gated)
    await ContactsScreen.expectVisible(Timeouts.COLD_START) // empty state (WhatAreContacts button) ⇒ agent-ready + empty list
    await ContactsScreen.link('whatAreContacts') // the empty state's only route to the info screen
    // The info screen has NO usable testID (its only one is an inline <Link> nested in a <ThemedText>,
    // which RN flattens into the paragraph). Assert arrival by the heading copy, then return via the
    // header back — the inline "Contacts list" link is not separately addressable.
    const heading = await engine.findByText(WHAT_ARE_CONTACTS_TITLE)
    await heading.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await WhatAreContactsScreen.back.tap() // → Contacts
    await ContactsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ContactsScreen.back.tap() // → Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.back.tap() // → Home
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // AccountDetails is verified-only (the Settings ProfileCard row that opens it is isVerified-gated —
  // the unverified journey asserts the row absent). Assert the screen renders its read-only field set;
  // the values are fixture-specific so we check presence, scrolling to the last field.
  it('verified: opens Account Details and shows the account fields', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('profile') // verified-only ProfileCard row → AccountDetails
    await AccountDetailsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // the nickname field renders once the account loads
    await AccountDetailsScreen.waitFor('seeFullDetails', Timeouts.SCREEN_TRANSITION) // the account-webview CTA
    await AccountDetailsScreen.waitFor('email', Timeouts.SCREEN_TRANSITION) // scroll to the last field → the full read-only set rendered
    await AccountDetailsScreen.back.tap() // → Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.back.tap() // → Home
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('logs in from a computer with a minted pairing code', async () => {
    const session = await fetchPairingCode() // Node replay against SIT → 6-letter code
    await HomeScreen.link('logInFromComputer') // verified-only PairingCodeCard → ManualPairingCode
    await ManualPairingScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ManualPairingScreen.fill('code', session.pairingCode) // 6 chars AUTO-SUBMIT → PairingConfirmation
    await PairingConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await PairingConfirmationScreen.tap('primary') // Close → back to the tabs (Home)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('logs in via a warm deep link and returns home', async () => {
    const appId = await getCurrentAppId()
    const session = await fetchPairingDeepLink({ platform: currentPlatform() })
    await dispatchDeepLink(session.deepLink, appId)
    await ServiceLoginScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ServiceLoginScreen.tap('primary') // Continue → PairingConfirmation (fromAppSwitch on a deep link)
    await PairingConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // BookmarkService (no Close on iOS app-switch)
    // The iOS app-switch confirmation has no Close button — an up-arrow guides the user back to the
    // browser, and sending the app to the background fires the fromAppSwitch reset to the Home tab.
    await driver.background(2)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // Cold-start LAST — it terminates the app, so nothing can run after it.
  it('logs in via a cold deep link after re-authenticating', async () => {
    const appId = await getCurrentAppId()
    const session = await fetchPairingDeepLink({ platform: currentPlatform() })
    await driver.terminateApp(appId)
    await driver.pause(500) // let the OS settle before the deep-link relaunch
    await dispatchDeepLink(session.deepLink, appId)
    // A cold launch is unauthenticated → AccountLanding (Unlock) → EnterPIN; the pending deep-link
    // pairing then makes ServiceLogin the post-auth route (not Home). The PIN auto-submits at 6 digits.
    await selectAccountLandingIfPresent() // multi-account card, if any (no-op on single-account)
    await AccountLandingScreen.expectVisible(Timeouts.APP_LAUNCH)
    await AccountLandingScreen.tap('primary') // Unlock → EnterPIN
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await EnterPINScreen.fill('pin', TEST_PIN) // combined never changes the PIN
    if (!(await ServiceLoginScreen.isPresent(Timeouts.SCREEN_TRANSITION))) {
      await EnterPINScreen.tapWhenEnabled('primary')
    }
    await ServiceLoginScreen.expectVisible(Timeouts.APP_LAUNCH)
    await ServiceLoginScreen.tap('secondary') // Cancel → Home
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('shows the account-transfer QR to add another device', async () => {
    await HomeScreen.tap('menu') // Main-stack Settings (post-verified)
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('addDevice') // verified-only, Main-stack only → TransferAccountQRInformation
    await TransferQRInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // GetQRCode
    await TransferQRInformationScreen.tap('primary') // → QR display
    await TransferQRDisplayScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // GetNewQRCode (the QR renderer has no testID)
    await TransferQRDisplayScreen.tap('primary') // regenerate the QR token
    await TransferQRDisplayScreen.back.tap() // → QR information
    await TransferQRInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await TransferQRInformationScreen.back.tap() // → Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.back.tap() // → Home
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('verified: edits the account nickname and it persists on the profile card', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('editProfile') // pencil in the (verified-only) ProfileCard → EditNickname
    await EditNicknameScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await EditNicknameScreen.fill('nickname', NEW_NICKNAME) // NB may need a clear first if the field pre-fills
    await EditNicknameScreen.tap('primary') // SaveAndContinue → goBack to Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The ProfileCard name (no testID) reflects the saved nickname.
    const renamed = await engine.findByText(NEW_NICKNAME)
    await renamed.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  })

  it('verified: forgets all device pairings', async () => {
    await SettingsScreen.link('forgetPairings') // verified-only row → ForgetAllPairings confirmation
    await ForgetPairingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ForgetPairingsScreen.tap('primary') // the Critical button confirms → native "Success" alert
    await acceptSystemAlert() // dismiss "OK"
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // goBack after the alert
  })

  // Manage Devices is verified-only and opens an in-app WebView (server-rendered device list, no content
  // testID). forget-pairings left us on Settings; assert we leave it, then pop back. Runs LAST so the
  // webview check can't block the proven verified checkpoints above.
  it('verified: opens Manage Devices (in-app webview) from Settings', async () => {
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('myDevices') // verified-only row → MainWebView (account/devices)
    assert.ok(
      !(await SettingsScreen.isPresent(Timeouts.ELEMENT_VISIBLE)),
      'Manage Devices should open the webview off the Settings screen'
    )
    await MainWebViewScreen.back.tap() // → Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
