import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { expectVerifiedInSettings } from '../../../../src/flows/main.js'
import type { PrevBuild } from '../../../../src/flows/prev-build/types.js'
import {
  approveInPersonAndComplete,
  reachInPersonConfirmationCode,
  resumeVerification,
} from '../../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { HomeScreen } from '../../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with an UNAPPROVED in-person request: authorize the device and display an in-person
 * confirmation code on the previous build WITHOUT approving it, install the current build over it,
 * then prove the request survives — resume lands on method selection, in-person still shows a code,
 * and approving it after the swap completes verification.
 *
 * The device is authorized (serial + birthdate) but not verified, so `getResumeStepRoute` returns
 * VerificationMethodSelection on the `verify` step; choosing in-person is navigation only and persists
 * no sub-step, so resume lands on method selection, not straight on VerifyInPerson.
 *
 * FINDING recorded, not asserted: whether the confirmation code shown after the upgrade is the same
 * one displayed before it, or freshly minted. Both are legitimate — the approval uses whichever code
 * is on screen post-swap — so this logs the answer rather than pinning a behaviour that is the app's
 * to choose.
 *
 * Photo card, so no camera. Needs the IDCheck credentials on an allowlisted runner for the approval.
 * The binary-swap proof lives in the base upgrade spec.
 */
export function defineInPersonPendingUpgrade(prev: PrevBuild): void {
  let appId: string | undefined
  let codeBeforeUpgrade: string | undefined

  before(() => {
    setTestUser(prev.bcscUser)
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (in-person pending, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('authorizes and displays an in-person code on the previous build, without approving', async () => {
    await annotate(`Upgrade (in-person pending, from ${prev.label}): displaying the code on the previous build`)
    await prev.authorize(getTestUser())
    // Read the code and STOP — no approval on the previous build. Never logged: it approves the request.
    codeBeforeUpgrade = await prev.showInPersonCode()
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (in-person pending, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('resume lands on method selection after the upgrade — the authorized request survived', async () => {
    await annotate(`Upgrade (in-person pending, from ${prev.label}): resuming onto method selection`)
    // An authorized-but-unverified user resumes to the method choice. Landing on the ID step (or the
    // setup-type question) instead would mean the authorization did not survive the update.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await resumeVerification(VerificationMethodSelectionScreen, Timeouts.APP_LAUNCH)
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('shows an in-person code after the upgrade and approving it completes verification', async () => {
    const codeAfterUpgrade = await reachInPersonConfirmationCode()
    // The finding: is the code carried across the upgrade, or freshly minted? Recorded (never the codes
    // themselves), not asserted.
    const persistence =
      codeAfterUpgrade === codeBeforeUpgrade ? 'SAME code across the upgrade' : 'FRESH code minted after the upgrade'
    console.log(`[upgrade-in-person] ${persistence}`)
    await annotate(`Upgrade (in-person pending, from ${prev.label}): ${persistence}`)

    await approveInPersonAndComplete(getTestUser(), codeAfterUpgrade)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('keeps the account verified: the Settings Profile row is present', async () => {
    await expectVerifiedInSettings()
    await annotate(
      `Upgrade (in-person pending, from ${prev.label}): SUCCESS — the request survived and was approved after the upgrade`
    )
  })
}
