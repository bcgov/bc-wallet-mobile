import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { selectAccountLandingIfPresent } from '../../../src/flows/auth.js'
import { openScanner } from '../../../src/flows/main.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  leaveVerificationToHome,
  reachVerificationMethod,
  resumeVerification,
  startVerification,
} from '../../../src/flows/verify.js'
import { findByA11yLabel } from '../../../src/helpers/a11y.js'
import { acceptAppAlert } from '../../../src/helpers/alerts.js'
import { returnFromBrowserHandoff } from '../../../src/helpers/browser-handoff.js'
import { injectQrCode } from '../../../src/helpers/camera.js'
import { currentPlatform, dispatchDeepLink, getCurrentAppId } from '../../../src/helpers/deep-link.js'
import {
  CUSTOM_CARD_COPY,
  EMPTY_NOTIFICATION_COPY,
  countNotificationListItems,
} from '../../../src/helpers/notifications.js'
import { fetchPairingCode, fetchPairingDeepLink, pairingQrUri } from '../../../src/helpers/pairing-code.js'
import { isSauceLabs } from '../../../src/helpers/sauce.js'
import { describeCurrentScreen, reachCameraScreen } from '../../../src/helpers/screens.js'
import { listServiceRows, serviceBookmarkId, serviceRowId, serviceRowLabel } from '../../../src/helpers/services.js'
import { expectWebViewOpen } from '../../../src/helpers/webview.js'
import { AccountLandingScreen, EnterPINScreen } from '../../../src/screens/auth.js'
import { BaseScreen } from '../../../src/screens/core/index.js'
import {
  AccountDetailsScreen,
  ContactsScreen,
  EditNicknameScreen,
  ForgetPairingsScreen,
  HomeNotificationCard,
  HomeScreen,
  MainWebViewScreen,
  ManualPairingScreen,
  PairingConfirmationScreen,
  QRCoreScreen,
  ServiceLoginScreen,
  ServiceLoginUnavailableScreen,
  ServicesScreen,
  SettingsScreen,
  TabBar,
  TransferQRDisplayScreen,
  TransferQRInformationScreen,
  WalletScreen,
  WhatAreContactsScreen,
} from '../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** Engine handle for text-based asserts on screens/elements that expose no testID (the ProfileCard name;
 *  the WhatAreContacts heading). */
const engine = new BaseScreen()
const NEW_NICKNAME = 'E2E Photo Account'
/** The WhatAreContacts info screen has no usable testID (its only one is an inline text Link that RN
 *  flattens), so arrival is asserted by its heading copy — `BCSC.Contacts.WhatAre.Title` (en). */
const WHAT_ARE_CONTACTS_TITLE = 'What are Contacts?'
/** PairingConfirmation's body — `BCSC.ManualPairing.CompletionDescription` (en) with the paired
 *  service interpolated. The service name carries no testID of its own. */
const pairedServiceCopy = (serviceName: string): string =>
  `Go back to the device you started on to continue logging in to ${serviceName}.`
/** ManualPairing's rejected-code surfaces (`BCSC.ManualPairing.*`, en): a native alert AND inline text. */
const PAIRING_CODE_REJECTED_MESSAGE = 'The code you entered does not match. Try again.'
/** Any 6 letters submit (auto-submit at length); a made-up value is rejected by the backend with a 404. */
const BOGUS_PAIRING_CODE = 'ZZZZZZ'

/** Which ServiceLogin view a catalogue row landed on. Both branches are real coverage; which one a
 *  given service renders is live SIT data (`initiate_login_uri` present or not). */
type ServiceLoginBranch = 'default' | 'unavailable'

async function detectServiceLoginBranch(): Promise<ServiceLoginBranch> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  for (;;) {
    if (await ServiceLoginScreen.isPresent(1_000)) return 'default'
    if (await ServiceLoginUnavailableScreen.isPresent(1_000)) return 'unavailable'
    if (Date.now() > deadline) {
      throw new Error(`ServiceLogin rendered neither branch. On screen: ${await describeCurrentScreen()}`)
    }
  }
}

/**
 * The DEFAULT (quick-login) branch, end to end: the secondary surfaces first — the in-app "what info
 * is shared" webview, the report-suspicious text (assert-only: its inner Link is RN-flattened), the
 * external privacy notice when the service carries one — then Continue, which opens the quick-login
 * URL in the EXTERNAL browser after resetting navigation to Home. Ends on Home.
 */
async function runQuickLoginBranch(): Promise<void> {
  const appId = await getCurrentAppId()
  await ServiceLoginScreen.link('help')
  await expectWebViewOpen()
  await MainWebViewScreen.back.tap()
  await ServiceLoginScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ServiceLoginScreen.waitFor('reportSuspicious', Timeouts.ELEMENT_VISIBLE)
  if (await ServiceLoginScreen.isVisible('privacy')) {
    await ServiceLoginScreen.link('privacy') // external browser
    await returnFromBrowserHandoff(appId)
    await ServiceLoginScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  }
  await ServiceLoginScreen.tap('primary') // Continue → external browser; the nav reset ran first
  await returnFromBrowserHandoff(appId)
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * The UNAVAILABLE branch (no quick-login URI, no pairing code): GoToServiceClient opens the service's
 * site in the EXTERNAL browser and leaves the screen mounted; its bare Cancel pops back to the
 * catalogue. Ends on Home to match the quick-login flow's exit state.
 */
async function runUnavailableBranch(): Promise<void> {
  if (await ServiceLoginUnavailableScreen.isVisible('serviceClientLink')) {
    console.log('[combined-journey] unavailable view renders its external service link')
  } else {
    console.warn('[combined-journey] unavailable view has NO service link — this service carries no client_uri')
  }
  const appId = await getCurrentAppId()
  await ServiceLoginUnavailableScreen.tap('primary') // GoToServiceClient → external browser, screen stays
  await returnFromBrowserHandoff(appId)
  await ServiceLoginUnavailableScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ServiceLoginUnavailableScreen.tap('secondary') // its own bare Cancel → back to the catalogue
  await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await TabBar.link('home')
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Verified journey: combined card. A combined card uses the same BCSC-photo authorize process as the
 * photo card and its authorize response carries a verified email, so it resumes straight to method
 * selection with NO email step. (The mandatory email step lives in the non-bcsc journey, where Skip is
 * hidden.)
 *
 * This is also the consolidation point for verified-state DETOURS — features that only need a verified
 * account, chained after verification so a SINGLE in-person approval validates them all: verified tab
 * nav + Services catalogue, the Contacts + Account Details surfaces, login-from-computer (minted pairing
 * code, entered then SCANNED), login via deep link (warm then cold), the transferer "add another device"
 * QR, and the verified-only settings rows (nickname edit + forget pairings). The cold deep-link
 * checkpoint terminates + relaunches the app, so it re-authenticates before continuing.
 *
 * One ordered session: onboard → manual serial → birthdate (authorizeDevice) → method selection →
 * in-person → verified Home (which carries NO custom card) → tab nav + Services → Contacts (empty) +
 * Account Details → login-from-computer (+ bookmark on the confirmation) → bogus-code rejection →
 * pairing-QR scan → catalogue bookmark-sort + search → catalogue ServiceLogin branches (quick-login
 * external handoff / Unavailable) → deep-link login (warm, then cold) → transferer QR → nickname edit
 * → forget pairings. mocha bail isolates any failure to this file. (There is no manual sign-out
 * control in the app — the only re-lock is the inactivity auto-lock, covered by the settings journey.)
 *
 * Catalogue platform split (forced by the app): rows are `accessible` ListButtons, so iOS flattens the
 * name-derived row/bookmark ids out of its a11y tree — iOS drives rows by label and bookmarks ONLY via
 * the confirmation-screen button; Android additionally asserts sort ORDER and the in-row toggle. The
 * ServiceLogin branch a service renders is live SIT metadata, so branch checkpoints record-and-invert
 * rather than hardcode, and skip with a logged reason when the data cannot produce a branch.
 */
describe('Verified journey: combined card', () => {
  /** The demo RP's display name from the pairing mint — the one KNOWN catalogue identity, set when the
   *  login-from-computer checkpoint bookmarks it on the confirmation screen. */
  let bookmarkedServiceName: string
  /** Which ServiceLogin branch the known service turned out to render — the probe checkpoint hunts
   *  for the other one. */
  let coveredLoginBranch: ServiceLoginBranch | undefined

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

  it('mid-verification Home shows exactly one custom card: Continue', async () => {
    // The ONE state that renders the Continue variant: authorized (id step completed) but not yet
    // verified. A quick Home detour observes it, then the resume card re-enters the flow — the same
    // machinery the resume journey proves.
    await leaveVerificationToHome()
    await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await HomeNotificationCard.read('body'), CUSTOM_CARD_COPY.continueVerification.body)
    assert.equal(await HomeNotificationCard.read('button'), CUSTOM_CARD_COPY.continueVerification.button)
    assert.equal(await countNotificationListItems(), 1, 'exactly one notification card should render')
    await resumeVerification()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.APP_LAUNCH) // resume re-lands here
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser())
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('clears the verification card from Home once verified', async () => {
    // The mirror of the Continue checkpoint above: verifying must retire the prompt card. NOT the
    // Verified "Finish up" card — that one needs `verificationRequestStatus === 'verified'`, which
    // only the send-video review path ever writes; in-person passes through VerificationSuccess
    // inline, so the empty state IS its verified Home (a renewal/expiry card would also break this,
    // and would mean the test account's card state changed).
    await engine.waitForText(EMPTY_NOTIFICATION_COPY, Timeouts.SCREEN_TRANSITION)
    assert.equal(await countNotificationListItems(), 0, 'the verification prompt card should be gone')
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

  it('logs in from a computer with a minted pairing code and bookmarks the service', async () => {
    const session = await fetchPairingCode() // Node replay against SIT → 6-letter code + the RP's name
    bookmarkedServiceName = session.clientName
    await HomeScreen.link('logInFromComputer') // verified-only PairingCodeCard → ManualPairingCode
    await ManualPairingScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ManualPairingScreen.fill('code', session.pairingCode) // 6 chars AUTO-SUBMIT → PairingConfirmation
    await PairingConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Bookmark the paired service (a local-store toggle; stays on this screen) — the catalogue
    // checkpoint later asserts it sorted to the top. This is the ONE bookmark control iOS can reach:
    // the in-catalogue toggles are flattened out of its a11y tree.
    await PairingConfirmationScreen.link('bookmark')
    await PairingConfirmationScreen.tap('primary') // Close → back to the tabs (Home)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('rejects a made-up pairing code with an alert and an inline error', async () => {
    await HomeScreen.link('logInFromComputer')
    await ManualPairingScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ManualPairingScreen.fill('code', BOGUS_PAIRING_CODE) // auto-submits → backend 404
    // The 404 path raises BOTH surfaces: a native alert, then inline error text under the code cells.
    await acceptAppAlert() // "Could not verify pairing code" / OK
    await ManualPairingScreen.waitFor('codeError', Timeouts.SCREEN_TRANSITION)
    await engine.waitForText(PAIRING_CODE_REJECTED_MESSAGE, Timeouts.ELEMENT_VISIBLE)
    // QRCore unmounts on exit, so the error state cannot leak into later pairing checkpoints.
    await QRCoreScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // The same login, driven through the CAMERA instead of the keyboard: a QR carrying a freshly minted
  // pairing code, injected before the scanner opens. Sauce-only (injection is), but the one scan
  // surface that works on BOTH platforms — Android decodes in-app via MLKit, iOS via Sauce's
  // synthesized QR metadata. Card barcodes have no such iOS path, so serial scanning stays manual.
  it('verified: scans a pairing QR and lands on the service confirmation', async function () {
    if (!isSauceLabs()) {
      return this.skip()
    }
    const session = await fetchPairingCode()
    await injectQrCode(pairingQrUri(session.pairingCode)) // before opening — see injectQrCode
    await openScanner()
    // The first frame can decode before the torch marker settles, skipping the scanner entirely —
    // accept either as "we got there". Also absorbs the camera-permission dialog, still ungranted in
    // this journey (verification took the manual-serial route, which never opens a camera).
    await reachCameraScreen(
      'QRCore scanner',
      async () => (await QRCoreScreen.isVisible('torch')) || (await PairingConfirmationScreen.isPresent(500))
    )
    // Decode → the sibling PairingCode tab, which auto-submits the scanned code → PairingConfirmation.
    await PairingConfirmationScreen.expectVisible(Timeouts.CAMERA_READY)
    // Naming the right service is the point of the checkpoint: reaching this screen only proves a
    // pairing succeeded, not that it was OUR transaction's service.
    await engine.waitForText(pairedServiceCopy(session.clientName), Timeouts.SCREEN_TRANSITION)
    await PairingConfirmationScreen.tap('primary') // Close → back to the tabs (Home)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('sorts the bookmarked service to the top of the catalogue and search-filters it', async function () {
    await TabBar.link('services') // gaining focus re-sorts: bookmarks promote to the top NOW, not on toggle
    await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The demo RP is only in the catalogue when SIT lists it for this card type — data, not app, so a
    // miss is a logged skip. Platform split throughout: iOS only sees flattened rows (label = title
    // with NBSP), Android reads the real ids and can also assert ORDER and drive the in-row toggle.
    if (driver.isIOS) {
      const row = findByA11yLabel(serviceRowLabel(bookmarkedServiceName))
      if (!(await row.isDisplayed().catch(() => false))) {
        console.warn(`[combined-journey] "${bookmarkedServiceName}" not in this card type's catalogue — skipping`)
        return this.skip()
      }
    } else {
      const rows = await listServiceRows()
      if (!rows.some((r) => r.id === serviceRowId(bookmarkedServiceName))) {
        console.warn(`[combined-journey] "${bookmarkedServiceName}" not in this card type's catalogue — skipping`)
        return this.skip()
      }
      assert.equal(rows[0]?.id, serviceRowId(bookmarkedServiceName), 'bookmarked service should sort first on focus')
    }
    // Search round-trip: filter to the known name (300ms debounce absorbed by the waits), then clear.
    await ServicesScreen.fill('search', bookmarkedServiceName)
    if (driver.isIOS) {
      await findByA11yLabel(serviceRowLabel(bookmarkedServiceName)).waitForDisplayed({
        timeout: Timeouts.ELEMENT_VISIBLE,
      })
    } else {
      await engine.waitForDisplayed(serviceRowId(bookmarkedServiceName), Timeouts.ELEMENT_VISIBLE)
    }
    await ServicesScreen.waitFor('clearSearch', Timeouts.ELEMENT_VISIBLE) // renders only while non-empty
    await ServicesScreen.link('clearSearch')
    assert.equal(await ServicesScreen.isVisible('clearSearch'), false, 'clearing should empty the query')
    if (!driver.isIOS) {
      // Exercise the in-catalogue toggle itself: OFF then ON. If either tap failed to register the
      // service would end unbookmarked and the re-focus order assert below would catch it. (The OFF
      // state's own order is the unknowable natural catalogue order — deliberately not asserted.)
      await engine.tapByTestId(serviceBookmarkId(bookmarkedServiceName))
      await engine.tapByTestId(serviceBookmarkId(bookmarkedServiceName))
      await TabBar.link('home')
      await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      await TabBar.link('services') // re-focus → re-sort
      await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      const rows = await listServiceRows()
      assert.equal(rows[0]?.id, serviceRowId(bookmarkedServiceName), 'service should still be bookmarked-first')
    }
  })

  it('logs in to the known catalogue service, covering whichever ServiceLogin branch it renders', async function () {
    // Entered from the catalogue with no pairing code, ServiceLogin renders on live metadata: the
    // default (quick-login) view when the service carries an initiate_login_uri, the Unavailable view
    // when it does not. Either is real coverage — record which, so the next checkpoint hunts the other.
    await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    if (driver.isIOS) {
      const row = findByA11yLabel(serviceRowLabel(bookmarkedServiceName))
      if (!(await row.isDisplayed().catch(() => false))) {
        console.warn(
          '[combined-journey] known service unavailable in the catalogue — skipping (see previous checkpoint)'
        )
        return this.skip()
      }
      await row.click()
    } else {
      const rows = await listServiceRows()
      if (!rows.some((r) => r.id === serviceRowId(bookmarkedServiceName))) {
        console.warn(
          '[combined-journey] known service unavailable in the catalogue — skipping (see previous checkpoint)'
        )
        return this.skip()
      }
      await engine.tapByTestId(serviceRowId(bookmarkedServiceName))
    }
    coveredLoginBranch = await detectServiceLoginBranch()
    if (coveredLoginBranch === 'default') {
      await runQuickLoginBranch()
    } else {
      await runUnavailableBranch()
    }
  })

  it('covers the other ServiceLogin branch from another catalogue service', async function () {
    if (!coveredLoginBranch) {
      return this.skip() // the known-service checkpoint already skipped — nothing recorded to invert
    }
    if (driver.isIOS) {
      console.warn(
        '[combined-journey] iOS cannot enumerate catalogue rows (flattened ids) — other-branch probe skipped'
      )
      return this.skip()
    }
    const wanted: ServiceLoginBranch = coveredLoginBranch === 'default' ? 'unavailable' : 'default'
    await TabBar.link('services')
    await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    const rows = await listServiceRows()
    const candidates = rows.filter((r) => r.id !== serviceRowId(bookmarkedServiceName)).slice(0, 3)
    for (const candidate of candidates) {
      await engine.tapByTestId(candidate.id)
      const branch = await detectServiceLoginBranch()
      if (branch === wanted) {
        if (wanted === 'default') {
          await runQuickLoginBranch()
        } else {
          await runUnavailableBranch()
        }
        return
      }
      // Not the branch we hunt — leave via this branch's own cancel (a goBack from the catalogue).
      if (branch === 'default') {
        await ServiceLoginScreen.tap('secondary')
      } else {
        await ServiceLoginUnavailableScreen.tap('secondary')
      }
      await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    }
    console.warn(
      `[combined-journey] no ${wanted}-branch service within the ${candidates.length} probed rows — SIT-data-dependent, skipping`
    )
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    return this.skip()
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
    await ForgetPairingsScreen.tap('primary') // the Critical button confirms → app "Success"/OK alert
    await acceptAppAlert() // tap the "Success — device unpaired" OK (app Alert.alert, not a system dialog)
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // goBack after the alert
  })

  // Manage Devices is verified-only and opens an in-app WebView (server-rendered device list, no content
  // testID). forget-pairings left us on Settings; assert we leave it, then pop back. Runs LAST so the
  // webview check can't block the proven verified checkpoints above.
  it('verified: opens Manage Devices (in-app webview) from Settings', async () => {
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('myDevices') // verified-only row → MainWebView (account/devices)
    // Assert the webview opened (positive arrival on its header back) rather than that Settings "left":
    // MainStack keeps Settings mounted underneath the push, so Android still reports it as displayed.
    await MainWebViewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await MainWebViewScreen.back.tap() // → Settings
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
