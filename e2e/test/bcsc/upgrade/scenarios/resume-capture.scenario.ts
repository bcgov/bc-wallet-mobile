import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { capability, nonBcscDocsOf, nonBcscUserOf, type PrevBuild } from '../../../../src/flows/prev-build/types.js'
import { resumeVerification } from '../../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { EvidenceIDCollectionScreen } from '../../../../src/screens/verify.js'
import { getNonBcscTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with a document captured but not yet numbered — the first non-BCSC ID photographed, the
 * typed form never submitted. Install the current build over it, then prove the photos survived —
 * resume lands back on EvidenceIDCollection.
 *
 * This is the partial capture the app deliberately keeps: hydration (which runs on every unlock,
 * including the post-upgrade one) drops an evidence entry with no photos, but preserves one whose
 * photos are in and whose number is pending, and `getResumeStepRoute` maps that to EvidenceIDCollection.
 * A selected-but-never-photographed ID is therefore NOT a preservable state across an upgrade — it is
 * cleaned up on the unlock and the ID step restarts.
 *
 * CAMERA-DEPENDENT (one document, injected on Sauce Android with the combo-card barcode masked), so it
 * runs on the injection-on lane. No IDCheck credentials. The binary-swap proof lives in the base
 * upgrade spec.
 */
export function defineResumeCaptureUpgrade(prev: PrevBuild): void {
  let appId: string | undefined

  before(() => {
    setTestUser(nonBcscUserOf(prev))
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (captured document, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getNonBcscTestUser())
  })

  it('photographs the first non-BCSC document and stops before its number on the previous build', async () => {
    // Photos committed, number not entered — the state the app preserves across an unlock.
    await capability(prev, 'captureFirstDocumentOnly')(getNonBcscTestUser(), nonBcscDocsOf(prev).first)
    await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (captured document, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('resume lands on the document-number form after the upgrade — the captured photos survived', async () => {
    await annotate(`Upgrade (captured document, from ${prev.label}): resuming onto the document-number form`)
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await resumeVerification(EvidenceIDCollectionScreen, Timeouts.APP_LAUNCH)
    await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await annotate(
      `Upgrade (captured document, from ${prev.label}): SUCCESS — the captured document survived the upgrade`
    )
  })
}
