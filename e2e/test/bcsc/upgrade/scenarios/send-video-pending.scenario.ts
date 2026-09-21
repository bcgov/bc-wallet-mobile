import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { expectVerifiedInSettings } from '../../../../src/flows/main.js'
import { capability, type PrevBuild } from '../../../../src/flows/prev-build/types.js'
import {
  cleanUpQueuedSubmission,
  clearReviewQueueBeforeSubmit,
  resumeVerification,
  waitForSendVideoDecision,
} from '../../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { type ClaimedRequestSummary, reviewSendVideoRequest } from '../../../../src/helpers/approval.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { HomeScreen } from '../../../../src/screens/main.js'
import { PendingReviewScreen, VerificationSuccessScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with a PENDING send-video review: submit a send-video request on the previous build,
 * install the current build over it, then prove the pending-review state survived — resume lands back
 * on PendingReview, and the scripted agent decision still reaches the app and completes it.
 *
 * A wiped submitted-video flag would drop the user back to the start of verification after an update,
 * losing a review that is already in the agent queue. The flag lives in native secure storage, so the
 * upgrade is what tests that it hydrates: after the swap the app must route back to the status screen
 * (`getResumeStepRoute` → PendingReview on `userSubmittedVerificationVideo`), not to method selection.
 *
 * This is a send-video journey in all but location, so it runs under the same serial conditions as the
 * `send-video` lane — its own one-platform-at-a-time job, the review queue drained before it submits,
 * and (on Android) an injection-OFF session, since the injection instrumentation wrecks the recorder's
 * stop/finalize. Those are wired by the send-video upgrade suite + lane, not here.
 *
 * The reject variant is deliberately NOT built: it would re-prove the same pending-review survival for
 * a different decision (CancelledReview + reason are already green in the send-video journeys), for
 * ~12 serial minutes. Revisit only if the upgrade changes the status-hydration path.
 *
 * The binary-swap proof lives in the base upgrade spec; this assumes the install swapped.
 */
export function defineSendVideoPendingUpgrade(prev: PrevBuild): void {
  let appId: string | undefined
  /** What the scripted review claimed — named by the decision wait's failure, should the app never see it. */
  let reviewed: ClaimedRequestSummary | undefined

  before(() => {
    setTestUser(prev.bcscUser)
  })

  after(async () => {
    await cleanUpQueuedSubmission()
  })

  it('clears the review queue before submitting', async () => {
    await clearReviewQueueBeforeSubmit()
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (send-video, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('submits a send-video request on the previous build', async () => {
    await annotate(`Upgrade (send-video, from ${prev.label}): submitting on the previous build`)
    await prev.authorize(getTestUser())
    await capability(prev, 'submitSendVideo')(getTestUser())
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (send-video, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('resume lands on PendingReview after the upgrade — the submitted flag survived', async () => {
    await annotate(`Upgrade (send-video, from ${prev.label}): resuming onto PendingReview`)
    // The submitted-video flag must survive native storage and hydration must route back to the status
    // screen. Landing anywhere else (method selection, the ID step) would mean the flag was wiped.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await resumeVerification(PendingReviewScreen, Timeouts.APP_LAUNCH)
    await PendingReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Back marks the account unverified rather than popping, returning the stack to Home — where the
    // decision wait below starts.
    await PendingReviewScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('is approved by the agent (scripted against the SIT review portal)', async () => {
    const user = getTestUser()
    reviewed = await reviewSendVideoRequest({
      decision: 'approve',
      cardSerialNumber: user.cardSerial,
      surname: user.lastName,
      firstName: user.firstName,
    })
  })

  it('picks up the approval and lands on verified Home', async () => {
    await waitForSendVideoDecision('verified', { reviewed })
    await VerificationSuccessScreen.tap('primary') // Continue → exits the verify stack to Home
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('keeps the account verified: the Settings Profile row is present', async () => {
    await expectVerifiedInSettings()
    await annotate(
      `Upgrade (send-video, from ${prev.label}): SUCCESS — pending review survived and completed after the upgrade`
    )
  })
}
