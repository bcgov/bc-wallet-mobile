import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import {
  expectAccountDetailsReadBack,
  expectServicesCatalogueOpens,
  expectVerifiedInSettings,
  loginWithPairingCode,
} from '../../../../src/flows/main.js'
import type { PrevBuild } from '../../../../src/flows/prev-build/types.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { TabBar } from '../../../../src/screens/main.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with a VERIFIED account: verify in person on the previous build, install the current build
 * over it, then prove the account is still verified — the device credential survived the swap.
 *
 * A lost credential (or a verified account read back as unverified) is the worst thing an update can
 * do to a real user, and the base upgrade spec only checks the PIN + auto-lock survive. After the swap
 * this asserts verified Home: Settings shows the Profile row, AccountDetails reads back, the Services
 * tab opens the catalogue (not the verify prompt), and one pairing-code login succeeds server-side.
 *
 * `prev` drives the previous build (its onboarding and verify screens differ per release); the
 * binary-swap proof itself lives in the base upgrade spec, so this spends its budget on the state.
 * Needs the IDCheck credentials on an allowlisted runner for the in-person approval (photo card, no
 * camera). mocha bail isolates any failure to the wrapper file.
 */
export function defineVerifiedUpgrade(prev: PrevBuild): void {
  let appId: string | undefined

  before(() => {
    setTestUser(prev.bcscUser)
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (verified, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('verifies in person on the previous build', async () => {
    await annotate(`Upgrade (verified, from ${prev.label}): verifying in person on the previous build`)
    await prev.authorize(getTestUser())
    const code = await prev.showInPersonCode()
    await prev.approveAndComplete(getTestUser(), code)
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (verified, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN and reaches Home', async () => {
    await annotate(`Upgrade (verified, from ${prev.label}): unlocking with the pre-upgrade PIN`)
    // A wiped install would sit on the onboarding Intro and time out inside unlockWithPin.
    await unlockWithPin(prev.pin)
    await TabBar.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('keeps the account verified: the Settings Profile row is present', async () => {
    // The Profile row (→ AccountDetails) is verified-gated, so its presence proves the account is
    // still verified after the swap — not merely that the app unlocked.
    await expectVerifiedInSettings()
  })

  it('reads back Account Details', async () => {
    await expectAccountDetailsReadBack()
  })

  it('opens the Services catalogue instead of the verify prompt', async () => {
    // An unverified account is bounced to MainVerifyPrompt on the Services tap; a verified one opens
    // the real catalogue.
    await expectServicesCatalogueOpens()
  })

  it('logs in with a pairing code — the device credential still works server-side', async () => {
    await annotate(`Upgrade (verified, from ${prev.label}): pairing-code login against SIT`)
    await loginWithPairingCode()
    await annotate(`Upgrade (verified, from ${prev.label}): SUCCESS — verified state survived the upgrade`)
  })
}
