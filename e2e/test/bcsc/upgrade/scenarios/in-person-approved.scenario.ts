import { unlockWithPin } from '../../../../src/flows/auth.js'
import { expectVerifiedInSettings } from '../../../../src/flows/main.js'
import type { PrevBuild } from '../../../../src/flows/prev-build/types.js'
import { approvalInputForUser, finishApprovedVerification } from '../../../../src/flows/verify.js'
import { closeRunningApp, installCurrentBuildOver, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { approveInPersonRequest } from '../../../../src/helpers/approval.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with an in-person request APPROVED WHILE THE APP WAS CLOSED — "approved, not finished
 * in-app": the user shows their code at the counter, the agent approves it, and the app is updated
 * before they ever reopen it to tap Complete. Display the code on the previous build, close the app,
 * approve the request in IDCheck, install the current build over the closed app, relaunch and unlock —
 * the current build must pick the approval up from wherever it resumes and reach verified Home.
 *
 * The approval lives server-side; what the upgrade tests is that the current build re-fetches it
 * (Complete on the code screen, or the resume path — `finishApprovedVerification`)
 * instead of treating the request as new. A fresh code minted on resume that orphans the approval is a
 * product finding, and this fails on it — not flake. Every lineage can arrange it: the in-person path is
 * the one each previous-build driver has.
 *
 * Photo card, so no camera. Needs the IDCheck credentials on an allowlisted runner.
 */
export function defineInPersonApprovedUpgrade(prev: PrevBuild): void {
  let appId: string | undefined
  let code: string | undefined

  before(() => {
    setTestUser(prev.bcscUser)
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (in-person approved, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('authorizes and displays an in-person code on the previous build', async () => {
    await annotate(`Upgrade (in-person approved, from ${prev.label}): displaying the code on the previous build`)
    await prev.authorize(getTestUser())
    // Read the code and stop. Never logged: it approves the request.
    code = await prev.showInPersonCode()
  })

  it('closes the app with the code on screen', async () => {
    appId = await closeRunningApp()
  })

  it('is approved in IDCheck while the app is closed (scripted against the SIT portal)', async () => {
    if (!code) throw new Error('the code step did not record a confirmation code')
    await annotate(`Upgrade (in-person approved, from ${prev.label}): approving while the app is closed`)
    await approveInPersonRequest(code, approvalInputForUser(getTestUser()))
  })

  it('installs the current build over the closed previous build', async () => {
    if (!appId) throw new Error('the close step did not record the app id')
    await annotate(`Upgrade (in-person approved, from ${prev.label}): installing the current build`)
    await installCurrentBuildOver(appId)
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('the close step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN and finishes the approved verification on the current build', async () => {
    await annotate(`Upgrade (in-person approved, from ${prev.label}): picking the approval up after the upgrade`)
    // A wiped install would sit on the onboarding Intro and time out inside unlockWithPin. Where the PIN
    // lands varies (the code screen, method selection, the prompt, Home); the finisher resolves it.
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await finishApprovedVerification('in-person')
  })

  it('keeps the account verified: the Settings Profile row is present', async () => {
    await expectVerifiedInSettings()
    await annotate(
      `Upgrade (in-person approved, from ${prev.label}): SUCCESS — an approval that landed while the app was closed completed after the upgrade`
    )
  })
}
