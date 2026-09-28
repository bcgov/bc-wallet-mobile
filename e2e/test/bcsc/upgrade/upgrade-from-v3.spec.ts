import assert from 'node:assert/strict'
import { Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { v3PrevBuild } from '../../../src/flows/prev-build/v3.js'
import { chooseAddAccount, resumeVerification } from '../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../src/helpers/app-install.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { AccountSetupScreen, IdentitySelectionScreen } from '../../../src/screens/verify.js'

/**
 * Upgrade from the legacy v3 app with an UNVERIFIED account — nickname + PIN set on v3, no card. The
 * migration lane and the v3 in-person wrapper both authorize a card on v3 first; this is the v3 user
 * who never got that far (and the state a serial typed on v3 degrades to: the current build never
 * reads v3's typed-serial file). After the swap the account and PIN must survive, and verification
 * must be startable on the current build: a migrant has no recorded setup type, so the resume asks it
 * first (AccountSetup), and Add account reaches the ID step from the top.
 *
 * The cheapest v3 run — no IDCheck credentials, no camera. The v3 driver lives in
 * `flows/prev-build/v3.ts`; the install and every post-upgrade step reuse the standard machinery.
 */
describe('Upgrade from v3 with an unverified account', () => {
  const prev = v3PrevBuild
  let appId: string | undefined

  it('onboards on v3 without verifying', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, prev.bcscUser)
  })

  it('installs the current build over v3', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    assert.ok(appId, 'install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the v3 PIN — no re-onboarding', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): unlocking with the v3 PIN`)
    // AccountLanding → EnterPIN (not the onboarding Intro) IS the account-preserved assert: a wiped
    // install would sit on Intro and time out inside unlockWithPin. The landing varies (prompt, Home
    // card or straight into the verify stack), so the next step resolves it.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
  })

  it('resume asks the setup type — an account with no verification progress starts from the question', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): resuming onto the setup-type question`)
    await resumeVerification(AccountSetupScreen, Timeouts.APP_LAUNCH)
    await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('starts the ID step on the current build', async () => {
    // Add account re-registers the migrated account if it has to, then opens the ID step.
    await chooseAddAccount()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await annotate(
      `Upgrade (unverified, from ${prev.label}): SUCCESS — the account survived and verification can start`
    )
  })
})
