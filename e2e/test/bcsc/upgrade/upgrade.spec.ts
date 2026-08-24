import assert from 'node:assert/strict'
import { TEST_PIN, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { openSettings } from '../../../src/flows/main.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { rowShowsWord } from '../../../src/helpers/a11y.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../src/helpers/app-install.js'
import { readSettingsVersionFooter } from '../../../src/helpers/developer.js'
import { annotate, isSauceLabs } from '../../../src/helpers/sauce.js'
import { AutoLockScreen, SettingsRowIds, SettingsScreen, TabBar } from '../../../src/screens/main.js'

/**
 * Upgrade from the previous released build to the current build under test.
 *
 * The session boots the PREVIOUS release (`PREV_ANDROID_APP` / `PREV_IOS_APP` in the upgrade
 * configs — default the rolling `BCSC-prev.*` kept fresh in Sauce storage by CI), onboards and
 * records state, then installs the current build over it (`ANDROID_APP_FILENAME` /
 * `IOS_APP_FILENAME` on Sauce; `ANDROID_APP` / `IOS_APP_DEVICE` locally). Same application id ⇒
 * in-place upgrade — the PIN and settings must survive.
 *
 * The previous build is driven with the CURRENT screen DSL: if a release renames testIDs or
 * reshapes onboarding, this suite fails on the old binary — that is upgrade signal, not flake.
 * Android installs only go old → new (versionCode = build run number; downgrades refuse).
 *
 * NOTE: iOS is skipped on Sauce public RDC — mid-session installs have historically bypassed
 * Sauce's resigning there (Apple rejects unsigned IPAs) and the storage-based install path is
 * unvalidated on iOS. Run iOS locally instead: `yarn test:ios:upgrade:device` (see e2e/README.md).
 */
describe('Upgrade from previous release', () => {
  let appId: string | undefined
  let previousVersionFooter: string | undefined

  before(function () {
    if (isSauceLabs() && driver.isIOS) {
      console.log('[upgrade] Skipping iOS on Sauce — mid-test installApp bypasses resigning (see spec header)')
      this.skip()
    }
  })

  it('onboards on the previous release and reaches Home', async () => {
    await annotate('Upgrade: onboarding on the previous release')
    await skipToHome(TEST_PIN)
  })

  it('sets Auto Lock to 3 minutes on the previous release', async () => {
    await openSettings()
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

  it('installs the current build over the previous release', async () => {
    await annotate('Upgrade: installing the current build')
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    assert.ok(appId, 'install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN — no re-onboarding', async () => {
    await annotate('Upgrade: unlocking with the pre-upgrade PIN')
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

  it('runs the current build, not the previous one', async () => {
    assert.ok(previousVersionFooter, 'pre-upgrade version footer was not recorded')
    const currentVersionFooter = await readSettingsVersionFooter()
    assert.notEqual(currentVersionFooter, previousVersionFooter, 'version footer should change across the upgrade')
    await annotate('Upgrade: SUCCESS — PIN and settings survived, binary swapped')
  })
})
