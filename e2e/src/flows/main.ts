import assert from 'node:assert/strict'
import { Timeouts } from '../constants.js'
import { fetchPairingCode } from '../helpers/pairing-code.js'
import {
  AccountDetailsScreen,
  HomeScreen,
  ManualPairingScreen,
  PairingConfirmationScreen,
  ServicesScreen,
  SettingsScreen,
  TabBar,
} from '../screens/main.js'

/** Main-stack navigation arranges. Expanded as more main/settings descriptors land. */

/**
 * Open Settings from the Home tab header. Arrival assertion lands with the settings descriptors —
 * until then callers assert their own target screen.
 */
export async function openSettings(): Promise<void> {
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeScreen.tap('menu')
}

/**
 * Open the QRCore scanner via the floating scan FAB (Home/Wallet tabs; not verification-gated).
 * Expect an OS camera-permission prompt on first use — handle with `helpers/alerts`.
 */
export async function openScanner(): Promise<void> {
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeScreen.link('scanFab')
}

/**
 * Assert the account reads as verified from Settings — the Profile row (→ AccountDetails) is
 * `isVerified`-gated, so its presence is the account-flipped-to-verified marker the verify journeys
 * use. Opens Settings, checks the row, returns to Home. Shared by the upgrade + migration lanes.
 */
export async function expectVerifiedInSettings(): Promise<void> {
  await openSettings()
  await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  assert.ok(
    await SettingsScreen.isVisible('profile'),
    'the Settings Profile row is verified-gated and should be present for a verified account'
  )
  await SettingsScreen.back.tap()
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Open Account Details (Settings → Profile) and assert its read-only field set renders, scrolling to
 * the last field. Values are fixture-specific, so this checks presence, not content. Ends on Home.
 */
export async function expectAccountDetailsReadBack(): Promise<void> {
  await openSettings()
  await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SettingsScreen.link('profile') // verified-only ProfileCard row → AccountDetails
  await AccountDetailsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // nickname field once the account loads
  await AccountDetailsScreen.waitFor('email', Timeouts.SCREEN_TRANSITION) // scroll to the last field → full set rendered
  await AccountDetailsScreen.back.tap()
  await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SettingsScreen.back.tap()
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * The Services tab opens the catalogue rather than the no-skip verify prompt — the verified-user
 * gate flip (an unverified tap is bounced to MainVerifyPrompt). Ends back on Home.
 */
export async function expectServicesCatalogueOpens(): Promise<void> {
  await TabBar.link('services')
  await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // catalogue search field = loaded, not gated
  await TabBar.link('home')
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Log in from a computer with a freshly minted pairing code → PairingConfirmation → Home. Proves the
 * device credential still authenticates server-side (a pairing mint is signed by the account). Uses
 * the manual-code card (its Close button is on both platforms, unlike the deep-link confirmation).
 */
export async function loginWithPairingCode(): Promise<void> {
  const session = await fetchPairingCode() // Node replay against SIT → 6-letter code + the RP's name
  await HomeScreen.link('logInFromComputer') // verified-only PairingCodeCard → ManualPairingCode
  await ManualPairingScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ManualPairingScreen.fill('code', session.pairingCode) // 6 chars AUTO-SUBMIT → PairingConfirmation
  await PairingConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await PairingConfirmationScreen.tap('primary') // Close → back to the tabs (Home)
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}
