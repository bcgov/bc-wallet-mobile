import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { capability, nonBcscDocsOf, nonBcscUserOf, type PrevBuild } from '../../../../src/flows/prev-build/types.js'
import { resumeVerification } from '../../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getNonBcscTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with PARTIAL non-BCSC progress — the richest half-finished state: two documents captured,
 * residential address filled, email verified, stopped before the method choice. Install the current
 * build over it, then prove the whole owed-nothing state survived — resume lands on method selection,
 * with no earlier step re-requested.
 *
 * All of id/address/email are complete but the device is not verified, so `getResumeStepRoute` returns
 * VerificationMethodSelection on the `verify` step. Landing there after the swap IS the "nothing
 * re-requested" proof: if any of the two documents, the address, or the email had been wiped, resume
 * would drop back to that earlier step instead.
 *
 * CAMERA-DEPENDENT (two documents, injected on Sauce Android with the combo-card barcode masked) and
 * INBOX-DEPENDENT (the mandatory non-BCSC email step needs a reachable disposable inbox), so it runs on
 * the injection-on lane and cannot run on a network that intercepts those providers.
 *
 * COMPLETION DEFERRED: finishing a non-BCSC account is in person, and the non-BCSC in-person approval
 * currently fails server-side (403 on the counter path — the automation account's identity-match role).
 * This lands the state-preservation proof (the resume) and skips completion until the counter approval
 * works again. The binary-swap proof lives in the base upgrade spec.
 */
export function defineNonBcscPartialUpgrade(prev: PrevBuild): void {
  let appId: string | undefined

  before(() => {
    setTestUser(nonBcscUserOf(prev))
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (non-BCSC partial, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getNonBcscTestUser())
  })

  it('captures two documents, the address, and a verified email on the previous build', async () => {
    await annotate(`Upgrade (non-BCSC partial, from ${prev.label}): arranging partial progress on the previous build`)
    // Ends on method selection with every earlier step complete — before choosing a method.
    await capability(prev, 'arrangeNonBcscPartial')(getNonBcscTestUser(), nonBcscDocsOf(prev))
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (non-BCSC partial, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('resume lands on method selection after the upgrade — nothing was re-requested', async () => {
    await annotate(`Upgrade (non-BCSC partial, from ${prev.label}): resuming onto method selection`)
    // Every owed step (two documents, address, email) is complete, so resume lands on the method
    // choice. Landing on the ID, address, or email step instead would mean that step was wiped.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await resumeVerification(VerificationMethodSelectionScreen, Timeouts.APP_LAUNCH)
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await annotate(
      `Upgrade (non-BCSC partial, from ${prev.label}): SUCCESS — partial progress survived and resumed to the method choice`
    )
  })

  it('completes in person and reaches verified Home', async function () {
    // Non-BCSC completion is in person, and the non-BCSC in-person counter approval currently fails
    // server-side (403). Land the state-preservation proof above and finish this when that is fixed.
    return this.skip()
  })
}
