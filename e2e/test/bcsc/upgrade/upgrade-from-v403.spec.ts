import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { openSettings } from '../../../src/flows/main.js'
import { onboardOnV403, openSettingsV403 } from '../../../src/flows/onboarding-v403.js'
import { rowShowsWord } from '../../../src/helpers/a11y.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../src/helpers/app-install.js'
import { readSettingsVersionFooter } from '../../../src/helpers/developer.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { AutoLockScreen, SettingsRowIds, SettingsScreen, TabBar } from '../../../src/screens/main.js'

/**
 * Upgrade from the 4.0.3 release — the shipped previous version — to the current build under test.
 *
 * 4.0.3 predates the onboarding rework, so the standard upgrade suite cannot drive it; phase 1
 * runs the frozen walk in `flows/onboarding-v403.ts` instead (previous binary: `PREV_ANDROID_APP`
 * / `PREV_IOS_APP`, default the preserved `BCSC-v4.0.3.*` in Sauce storage). The install and every
 * post-upgrade assertion reuse the standard machinery — after the install this IS the current
 * build, driven by the current DSL. Settings/auto-lock also use the current DSL on the old build
 * (those testIDs are unchanged since 4.0.3); only Settings ACCESS differs (no scan FAB yet).
 *
 * Runs on Sauce for both platforms — the storage-based mid-session install passes Sauce
 * resigning (validated 2026-08-25 on the standard suite).
 * Retire alongside `flows/onboarding-v403.ts` once 4.1.0 becomes the previous release.
 */
describe('Upgrade from the 4.0.3 release', () => {
  let appId: string | undefined
  let previousVersionFooter: string | undefined

  it('onboards on the 4.0.3 release and reaches its Setup Steps resting screen', async () => {
    await annotate('Upgrade from 4.0.3: onboarding on the previous release')
    await onboardOnV403(TEST_PIN)
  })

  it('sets Auto Lock to 3 minutes on the 4.0.3 release', async () => {
    await openSettingsV403()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('autoLock')
    await AutoLockScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await AutoLockScreen.link('time3') // saved immediately on tap
    await AutoLockScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(await rowShowsWord(SettingsRowIds.autoLock, '3 min'), 'Auto Lock row should show "3 min"')
    // Pre-upgrade footer — the post-upgrade compare proves installApp actually swapped the binary.
    previousVersionFooter = await readSettingsVersionFooter()
  })

  it('installs the current build over the 4.0.3 release', async () => {
    await annotate('Upgrade from 4.0.3: installing the current build')
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    assert.ok(appId, 'install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN — no re-onboarding', async () => {
    await annotate('Upgrade from 4.0.3: unlocking with the pre-upgrade PIN')
    // Landing on AccountLanding → EnterPIN (not the onboarding Intro walk) IS the data-preserved
    // assert: a wiped install would sit on Intro and time out inside unlockWithPin.
    await unlockWithPin(TEST_PIN)
    await TabBar.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('keeps the Auto Lock setting across the upgrade', async () => {
    await openSettings()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(await rowShowsWord(SettingsRowIds.autoLock, '3 min'), 'Auto Lock should survive the upgrade')
  })

  it('runs the current build, not the 4.0.3 one', async () => {
    assert.ok(previousVersionFooter, 'pre-upgrade version footer was not recorded')
    const currentVersionFooter = await readSettingsVersionFooter()
    assert.notEqual(currentVersionFooter, previousVersionFooter, 'version footer should change across the upgrade')
    await annotate('Upgrade from 4.0.3: SUCCESS — PIN and settings survived, binary swapped')
  })
})
