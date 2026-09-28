import { Timeouts } from '../../../../src/constants.js'
import { unlockWithPin } from '../../../../src/flows/auth.js'
import { capability, type PrevBuild } from '../../../../src/flows/prev-build/types.js'
import { resumeVerification } from '../../../../src/flows/verify.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../../src/helpers/app-install.js'
import { annotate } from '../../../../src/helpers/sauce.js'
import { EnterBirthdateScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Upgrade with a saved serial — the cheapest pre-authorize partial state: a card serial entered but
 * the birthdate never submitted (the device is not authorized). Install the current build over it, then
 * prove the saved serial survived — resume lands on EnterBirthdate.
 *
 * The serial is persisted in native secure storage but the card is not authorized (no deviceCode, no
 * cardProcess), so `getResumeStepRoute` returns EnterBirthdate. Landing there after the swap proves the
 * serial hydrated; landing on IdentitySelection would mean it was wiped.
 *
 * Deliberately cheap — nothing is verified, no camera, no IDCheck credentials. The binary-swap proof
 * lives in the base upgrade spec.
 */
export function defineResumeSerialUpgrade(prev: PrevBuild): void {
  let appId: string | undefined

  before(() => {
    setTestUser(prev.bcscUser)
  })

  it('onboards on the previous build', async () => {
    await annotate(`Upgrade (saved serial, from ${prev.label}): onboarding on the previous build`)
    await prev.onboard(prev.pin, getTestUser())
  })

  it('saves a card serial and stops on the birthdate step on the previous build', async () => {
    // Stops at the birthdate WITHOUT submitting: the serial is persisted, the card is not authorized.
    await capability(prev, 'enterSerial')(getTestUser())
  })

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (saved serial, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('resume lands on the birthdate step after the upgrade — the saved serial survived', async () => {
    await annotate(`Upgrade (saved serial, from ${prev.label}): resuming onto the birthdate step`)
    await unlockWithPin(prev.pin, { relaunch: false, landing: 'any' })
    await resumeVerification(EnterBirthdateScreen, Timeouts.APP_LAUNCH)
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await annotate(`Upgrade (saved serial, from ${prev.label}): SUCCESS — the saved serial survived the upgrade`)
  })
}
