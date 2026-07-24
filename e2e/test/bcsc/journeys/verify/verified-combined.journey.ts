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
  EditNicknameScreen,
  ForgetPairingsScreen,
  HomeScreen,
  ManualPairingScreen,
  PairingConfirmationScreen,
  ServiceLoginScreen,
  ServicesScreen,
  SettingsScreen,
  TabBar,
  TransferQRDisplayScreen,
  TransferQRInformationScreen,
  WalletScreen,
} from '../../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/** Engine handle for the nickname persistence assert (the ProfileCard name exposes no testID). */
const engine = new BaseScreen()
const NEW_NICKNAME = 'E2E Photo Account'

/**
 * Verified journey: combined card. A combined card uses the same BCSC-photo authorize process as the
 * photo card and its authorize response carries a verified email, so it resumes straight to method
 * selection with NO email step. (The mandatory email step lives in the non-bcsc journey, where Skip is
 * hidden.)
 *
 * This is also the consolidation point for verified-state DETOURS — features that only need a verified
 * account, chained after verification so a SINGLE in-person approval validates them all: verified tab
 * nav + Services catalogue, login-from-computer (minted pairing code), and login via deep link (warm,
 * then a cold start). The cold deep-link checkpoint is LAST because it terminates the app.
 *
 * One ordered session: onboard → Continue → manual serial → birthdate (authorizeDevice) → method
 * selection → in-person → verified Home → tab nav + Services → login-from-computer → deep-link login
 * (warm, then cold). Contacts + AccountDetails append here later. mocha bail isolates any failure here
 * → transferer QR (the verified "add another device" flow).
 *
 *  It then exercises the verified-only settings rows (nickname edit + forget pairings); Contacts /
 * AccountDetails + login checkpoints chain on later. (There is no manual sign-out control in the app —
 * the only re-lock is the inactivity auto-lock, covered by the settings journey.)
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
})
