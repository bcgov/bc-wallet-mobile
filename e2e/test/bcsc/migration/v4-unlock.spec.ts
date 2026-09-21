import { Timeouts } from '../../../src/constants.js'
import { selectAccountLandingIfPresent } from '../../../src/flows/auth.js'
import {
  expectAccountDetailsReadBack,
  expectServicesCatalogueOpens,
  expectVerifiedInSettings,
  loginWithPairingCode,
} from '../../../src/flows/main.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { AccountLandingScreen, EnterPINScreen } from '../../../src/screens/auth.js'
import { HomeScreen, TabBar } from '../../../src/screens/main.js'
import { migrationContext } from './migration-context.js'

/**
 * Unlock the v4 app after upgrading from v3.
 *
 * After in-place upgrade, v4 detects the existing keychain/secure-storage data from v3 and routes to the
 * returning-user unlock flow (AccountLanding → EnterPIN) rather than fresh onboarding. This spec enters
 * the PIN created during v3 onboarding and verifies the app lands on Home.
 *
 * v4 is a SINGLE-account unlock — one `Unlock` on AccountLanding, no account-selector / per-nickname
 * card — so the old `CardButton-<nickname>` step is gone (it referenced a v3 concept that no longer
 * exists in v4).
 */
describe('Upgrade from v3: unlocking with the v3 PIN', () => {
  it('unlocks the migrated account and enters the v3 PIN', async () => {
    await annotate('Migration: V4 unlock')
    await selectAccountLandingIfPresent()
    await AccountLandingScreen.expectVisible(Timeouts.APP_LAUNCH)
    await AccountLandingScreen.tap('primary') // Unlock → EnterPIN
    await EnterPINScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await EnterPINScreen.fill('pin', migrationContext.pin) // 6-digit PIN auto-submits
  })

  it('lands on the Home screen', async () => {
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await TabBar.expectVisible(Timeouts.SCREEN_TRANSITION)
    await annotate('Migration: SUCCESS — v4 unlocked with v3 PIN')
    console.log('[migration] v4 app unlocked successfully with v3 PIN')
  })

  // The v3 account was verified in person before the upgrade, so v4 must read it back as verified —
  // the same four checks the `verified` upgrade scenario makes on the other lineages, so this lane IS
  // the verified × v3 cell. v3 already paid for the approval, so this is nearly free here.
  it('keeps the account verified: the Settings Profile row is present', async () => {
    await expectVerifiedInSettings()
  })

  it('reads back Account Details', async () => {
    await expectAccountDetailsReadBack()
  })

  it('opens the Services catalogue instead of the verify prompt', async () => {
    await expectServicesCatalogueOpens()
  })

  it('logs in with a pairing code — the migrated device credential still works server-side', async () => {
    await annotate('Migration: pairing-code login against SIT')
    await loginWithPairingCode()
    await annotate('Migration: SUCCESS — verified state survived the v3 → v4 upgrade')
  })
})
