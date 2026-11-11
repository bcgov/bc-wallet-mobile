import { unlockWithPin } from '../../../../src/flows/auth.js'
import { expectVerifiedInSettings } from '../../../../src/flows/main.js'
import { capability, type PrevBuild } from '../../../../src/flows/prev-build/types.js'
import {
  cleanUpQueuedSubmission,
  clearReviewQueueBeforeSubmit,
  finishApprovedVerification,
} from '../../../../src/flows/verify.js'
import { closeRunningApp, installCurrentBuildOver, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { reviewSendVideoRequest } from '../../../../src/helpers/approval.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with a send-video review APPROVED WHILE THE APP WAS CLOSED — "approved, not finished
 * in-app": the user uploads their video, closes the app, the agent approves the request, and the app
 * is updated before they reopen it. Submit on the previous build, close the app, script the approval,
 * install the current build over the closed app, relaunch and unlock — the current build must pick
 * the decision up (the pending review's own re-check, the Home card, or straight onto
 * VerificationSuccess) and reach verified Home.
 *
 * Like the pending variant this is a send-video journey in all but location: it reviews the shared
 * blind-FIFO queue, so it runs one platform at a time with the queue drained first, and on Android in
 * an injection-OFF session (the instrumentation wrecks the recorder's stop/finalize) — wired by the
 * suite + lane, not here. Only the 4.1.x lineage has a send-video driver.
 */
export function defineSendVideoApprovedUpgrade(prev: PrevBuild): void {
  let appId: string | undefined

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
    await annotate(`Upgrade (send-video approved, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('submits a send-video request on the previous build', async () => {
    await annotate(`Upgrade (send-video approved, from ${prev.label}): submitting on the previous build`)
    await prev.authorize(getTestUser())
    await capability(prev, 'submitSendVideo')(getTestUser())
  })

  it('closes the app with the review pending', async () => {
    appId = await closeRunningApp()
  })

  it('is approved by the agent while the app is closed (scripted against the SIT review portal)', async () => {
    const user = getTestUser()
    const reviewed = await reviewSendVideoRequest({
      decision: 'approve',
      cardSerialNumber: user.cardSerial,
      surname: user.lastName,
      firstName: user.firstName,
    })
    console.log(`[upgrade-send-video] the scripted review approved ${reviewed.queue} request ${reviewed.requestIdentifier} (${reviewed.persona})`)
  })

  it('installs the current build over the closed previous build', async () => {
    if (!appId) throw new Error('the close step did not record the app id')
    await annotate(`Upgrade (send-video approved, from ${prev.label}): installing the current build`)
    await installCurrentBuildOver(appId)
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('the close step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN and picks the decision up on the current build', async () => {
    await annotate(`Upgrade (send-video approved, from ${prev.label}): picking the decision up after the upgrade`)
    // The submitted-video flag must survive native storage: a resume onto method selection fails inside
    // the finisher. Where the PIN lands otherwise varies (the pending review, the Home card, the
    // decision screen itself); the finisher resolves it.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await finishApprovedVerification('send-video')
  })

  it('keeps the account verified: the Settings Profile row is present', async () => {
    await expectVerifiedInSettings()
    await annotate(
      `Upgrade (send-video approved, from ${prev.label}): SUCCESS — a decision that landed while the app was closed completed after the upgrade`
    )
  })
}
