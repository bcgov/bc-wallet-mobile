import assert from 'node:assert/strict'
import { Timeouts } from '../../../src/constants.js'
import { openScanner } from '../../../src/flows/main.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { injectQrCode } from '../../../src/helpers/camera.js'
import { isSauceLabs } from '../../../src/helpers/sauce.js'
import { reachCameraScreen } from '../../../src/helpers/screens.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import {
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
 * MainVerifyPrompt, while Home, the empty Wallet, the QR scanner, and Settings stay reachable. The
 * scanner's own failure path (unrecognised QR → error popup) rides along, since it needs no account.
 * AccountDetails is deliberately absent: its Settings row (`Profile`) and its account data are both
 * verified-gated — this journey asserts the row's absence; the verified screen is covered separately.
 * Verified tab/Services content rides the verified card journeys.
 */

/** Engine handle for the MainVerifyPrompt title — the screen's only distinguishing marker is copy. */
const engine = new BaseScreen()

/** The scan-error popup's body for a QR no strategy claims — `BCSC.Scan.UnrecognizedQR` (en). */
const UNRECOGNIZED_QR_MESSAGE = 'QR code not recognized.'

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
    await injectQrCode('not-a-supported-code') // before opening — see injectQrCode
    await openScanner()
    // The first frame can decode before the torch marker settles, so the popup can beat the scanner.
    await reachCameraScreen(
      'QRCore scanner',
      async () => (await QRCoreScreen.isVisible('torch')) || (await ScanErrorModal.isPresent(500))
    )
    await ScanErrorModal.expectVisible(Timeouts.CAMERA_READY)
    assert.equal((await ScanErrorModal.read('body')).trim(), UNRECOGNIZED_QR_MESSAGE)
    await ScanErrorModal.tap('primary') // Dismiss → clears the error and re-arms the scanner
    await QRCoreScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('Settings opens unverified and hides the account profile row', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('profile'), false, 'Profile row is verified-gated')
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
