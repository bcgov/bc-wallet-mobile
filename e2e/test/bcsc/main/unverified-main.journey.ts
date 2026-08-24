import assert from 'node:assert/strict'
import { Timeouts } from '../../../src/constants.js'
import { openScanner } from '../../../src/flows/main.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { injectQrCode } from '../../../src/helpers/camera.js'
import { CUSTOM_CARD_COPY, countNotificationListItems } from '../../../src/helpers/notifications.js'
import { mediatorInviteUri, openIdCredentialOfferUri } from '../../../src/helpers/qr-payloads.js'
import { isSauceLabs } from '../../../src/helpers/sauce.js'
import { reachCameraScreen } from '../../../src/helpers/screens.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import {
  HomeNotificationCard,
  HomeScreen,
  MainVerifyPromptScreen,
  QRCoreScreen,
  ScanErrorModal,
  SettingsScreen,
  TabBar,
  WalletScreen,
} from '../../../src/screens/main.js'

/**
 * Main journey: unverified gating.
 *
 * Arrange: `skipToHome()` (~1–2 min). The verification-gating redirects ARE the checkpoints here:
 * unverified taps on the Services tab and QRCore's PairingCode tab must land on the no-skip
 * MainVerifyPrompt, while Home, the empty Wallet, the QR scanner, and Settings stay reachable. Home's
 * single custom card (the Start-verification variant on this fresh account) is asserted by copy. The
 * scanner's rejection matrix rides along, since it needs no account: an unrecognised QR and the two
 * DELIBERATE refusals (OpenID offers, mediator invitations) each surface the error popup and re-arm.
 * AccountDetails is deliberately absent: its Settings row (`Profile`) and its account data are both
 * verified-gated — this journey asserts the row's absence; the verified screen is covered separately.
 * Verified tab/Services content rides the verified card journeys.
 */

/** Engine handle for the MainVerifyPrompt title — the screen's only distinguishing marker is copy. */
const engine = new BaseScreen()

/** The scan-error popup's body for a QR no strategy claims — `BCSC.Scan.UnrecognizedQR` (en). */
const UNRECOGNIZED_QR_MESSAGE = 'QR code not recognized.'
/** The DELIBERATE rejections (`BCSC.Scan.Unsupported.*`, en) — recognized content the app refuses. */
const UNSUPPORTED_OPENID_MESSAGE = "OpenID credentials aren't supported in BC Services Card."
const UNSUPPORTED_MEDIATOR_MESSAGE = "Mediator invitations aren't supported in BC Services Card."

/**
 * Drive one injected QR through the scanner to its error popup and back to Home. The injection must
 * happen BEFORE the scanner opens (see injectQrCode), and the first frame can decode before the torch
 * marker settles — so the popup may beat the scanner-ready probe.
 */
async function expectScanRejection(payload: string, message: string): Promise<void> {
  await injectQrCode(payload)
  await openScanner()
  await reachCameraScreen(
    'QRCore scanner',
    async () => (await QRCoreScreen.isVisible('torch')) || (await ScanErrorModal.isPresent(500))
  )
  await ScanErrorModal.expectVisible(Timeouts.CAMERA_READY)
  // The popup's `BodyText` id collides with the Home notification card — assert the copy instead.
  await engine.waitForText(message, Timeouts.CAMERA_READY)
  await ScanErrorModal.tap('primary') // Dismiss → clears the error and re-arms the scanner
  await QRCoreScreen.back.tap()
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

async function expectVerifyPromptRedirect(): Promise<void> {
  await MainVerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // No body testIDs besides the ubiquitous Continue — disambiguate via the title copy.
  const title = await engine.findByText('Verify your account')
  await title.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
}

describe('Main journey: unverified gating', () => {
  it('onboards and skips to unverified Home', async () => {
    await skipToHome()
  })

  it('Home shows exactly one custom card: Start verification', async () => {
    // useCustomNotifications returns at most ONE card, and a fresh unverified account with no DIDComm
    // traffic must land on the Start variant. All seven variants share their testIDs — and Start and
    // Continue even share their TITLE — so the copy (body + button) is the discriminator.
    await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await HomeNotificationCard.read('title'), CUSTOM_CARD_COPY.start.title)
    assert.equal(await HomeNotificationCard.read('body'), CUSTOM_CARD_COPY.start.body)
    assert.equal(await HomeNotificationCard.read('button'), CUSTOM_CARD_COPY.start.button)
    assert.equal(await countNotificationListItems(), 1, 'exactly one notification card should render')
  })

  it('Services tab redirects to the verify prompt, and back returns to the tabs', async () => {
    await TabBar.link('services')
    await expectVerifyPromptRedirect()
    await MainVerifyPromptScreen.back.tap()
    // The gated tab press was prevented, so we return to the previously focused Home tab.
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('Wallet tab shows the empty credential wallet', async () => {
    await TabBar.link('wallet')
    // The Credo agent boots for any authenticated user (verified or not) — allow it the
    // cold-start budget before the empty state renders behind the Wallet.Loading gate.
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('the scan FAB opens the ungated QR scanner', async () => {
    await HomeScreen.link('scanFab')
    // Scanner mount auto-requests camera permission; accept it whenever the OS raises it (no-op when
    // already granted). The torch control only renders once the camera is live, so it — not the tab
    // bar (the screen's `self`), which is up immediately — is the scanner-ready marker.
    await reachCameraScreen('QRCore scanner', () => QRCoreScreen.isVisible('torch'))
    // QRDisplay is developer-mode-gated and must be absent in a normal run (descoped from CI).
    assert.equal(await QRCoreScreen.isVisible('displayTab'), false, 'dev-only Display tab should be absent')
  })

  it('the pairing-code tab inside QRCore is gated to the verify prompt', async () => {
    await QRCoreScreen.link('pairingCodeTab')
    await expectVerifyPromptRedirect()
    await MainVerifyPromptScreen.back.tap()
    await QRCoreScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await QRCoreScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // The scanner's failure path, driven by a real decode: an unrecognised QR must surface the error
  // popup rather than navigate. Sauce-only (camera injection is), and the QR is rendered at runtime
  // rather than committed — it is a one-line payload, not a fixture.
  it('an unrecognised QR raises the scan-error popup', async function () {
    if (!isSauceLabs()) {
      return this.skip()
    }
    await expectScanRejection('not-a-supported-code', UNRECOGNIZED_QR_MESSAGE)
  })

  it('an OpenID credential-offer QR is deliberately rejected', async function () {
    if (!isSauceLabs()) {
      return this.skip()
    }
    // Recognized by scheme and refused before any parsing (BCSC is AnonCreds-only). The agent booted
    // during the Wallet checkpoint above, so the racy AgentNotReady window is long gone.
    await expectScanRejection(openIdCredentialOfferUri(), UNSUPPORTED_OPENID_MESSAGE)
  })

  it('a mediator-invitation QR is deliberately rejected', async function () {
    if (!isSauceLabs()) {
      return this.skip()
    }
    // A VALID out-of-band invitation that credo parses, rejected at the aries.vc.mediate goal-code
    // check — before any network use. If a credo upgrade tightens invitation validation, mint the
    // invitation from the issuer with this goal code instead (see qr-payloads.ts).
    await expectScanRejection(mediatorInviteUri(), UNSUPPORTED_MEDIATOR_MESSAGE)
  })

  it('Settings opens unverified and hides the account profile row', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('profile'), false, 'Profile row is verified-gated')
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
