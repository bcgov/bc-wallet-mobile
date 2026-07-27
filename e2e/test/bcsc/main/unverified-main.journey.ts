import assert from 'node:assert/strict'
import { Timeouts } from '../../../src/constants.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { acceptSystemAlert } from '../../../src/helpers/alerts.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import {
  HomeScreen,
  MainVerifyPromptScreen,
  QRCoreScreen,
  SettingsScreen,
  TabBar,
  WalletScreen,
} from '../../../src/screens/main.js'

/**
 * Main journey: unverified gating.
 *
 * Arrange: `skipToHome()` (~1–2 min). The verification-gating redirects ARE the checkpoints here:
 * unverified taps on the Services tab and QRCore's PairingCode tab must land on the no-skip
 * MainVerifyPrompt, while Home, the empty Wallet, the QR scanner, and Settings stay reachable.
 * AccountDetails is deliberately absent: its Settings row (`Profile`) and its account data are both
 * verified-gated — this journey asserts the row's absence; the verified screen is covered separately.
 * Verified tab/Services content rides the verified card journeys.
 */

/** Engine handle for the MainVerifyPrompt title — the screen's only distinguishing marker is copy. */
const engine = new BaseScreen()

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
    // Scanner mount auto-requests camera permission; no-op when already granted.
    await acceptSystemAlert()
    await QRCoreScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The torch control only renders once the camera is live — the scanner-ready marker.
    await QRCoreScreen.waitFor('torch', Timeouts.SCREEN_TRANSITION)
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

  it('Settings opens unverified and hides the account profile row', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.equal(await SettingsScreen.isVisible('profile'), false, 'Profile row is verified-gated')
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
