import assert from 'node:assert/strict'
import { Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { openSettings } from '../../../src/flows/main.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { rowShowsWord } from '../../../src/helpers/a11y.js'
import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../src/helpers/app-install.js'
import { expectDeveloperModeHidden, readSettingsVersionFooter } from '../../../src/helpers/developer.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { AutoLockScreen, SettingsRowIds, SettingsScreen, TabBar } from '../../../src/screens/main.js'

/**
 * Upgrade from a shipped 4.1.x build to the current build under test, with an UNVERIFIED account — the
 * base check: the PIN and settings survive and the binary really swapped.
 *
 * The session boots the build `PREV_VERSION` names (the upgrade configs resolve `BCSC-v<version>.*`
 * from `e2e/upgrade-sources.json`), onboards and records state, then installs the current build over
 * it (`ANDROID_APP_FILENAME` / `IOS_APP_FILENAME` on Sauce; `ANDROID_APP` / `IOS_APP_DEVICE` locally).
 * Same application id ⇒ in-place upgrade — the PIN and settings must survive.
 *
 * The previous build is driven with the CURRENT screen DSL: if a release renames testIDs or reshapes
 * onboarding, this spec fails on the old binary — that is upgrade signal, not flake. 4.0.x and 3.x have
 * their own unverified specs (`upgrade-unverified-v403`, `upgrade-unverified-v3`) because their
 * screens differ. Android installs only go old → new (versionCode = build run number; downgrades refuse).
 *
 * iOS on Sauce works: the storage-based `mobile: installApp` goes through Sauce's resigning
 * (validated 2026-08-25, 7/7 on a public RDC iPhone). A local real-device run remains available:
 * `PREV_VERSION=<version> yarn test:ios:upgrade:device --suite upgradePartial`.
 */
describe('Upgrade with an unverified account: the PIN and settings survive', () => {
  const prev = prevBuildFromEnv('current')
  let appId: string | undefined
  let previousVersionFooter: string | undefined

  it('onboards on the previous build and reaches Home', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): onboarding on the previous build`)
    await skipToHome(prev.pin)
  })

  it('sets Auto Lock to 3 minutes on the previous build', async () => {
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

  it('installs the current build over the previous build', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): installing the current build`)
    appId = await installCurrentBuildOverRunningApp()
  })

  it('relaunches as the current build', async () => {
    assert.ok(appId, 'install step did not record the app id')
    await relaunchAfterInstall(appId)
  })

  it('unlocks with the pre-upgrade PIN — no re-onboarding', async () => {
    await annotate(`Upgrade (unverified, from ${prev.label}): unlocking with the pre-upgrade PIN`)
    // Landing on AccountLanding → EnterPIN (not the onboarding Intro walk) IS the data-preserved
    // assert: a wiped install would sit on Intro and time out inside unlockWithPin.
    await unlockWithPin(prev.pin)
    await TabBar.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('keeps the Auto Lock setting across the upgrade', async () => {
    await openSettings()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(await rowShowsWord(SettingsRowIds.autoLock, '3 min'), 'Auto Lock should survive the upgrade')
  })

  it('keeps developer mode off across the upgrade: the Developer options row is absent', async () => {
    // Settings is still open from the Auto Lock check; the mode was never turned on before the swap.
    await expectDeveloperModeHidden()
  })

  it('runs the current build, not the previous one', async () => {
    assert.ok(previousVersionFooter, 'pre-upgrade version footer was not recorded')
    const currentVersionFooter = await readSettingsVersionFooter()
    assert.notEqual(currentVersionFooter, previousVersionFooter, 'version footer should change across the upgrade')
    await annotate(`Upgrade (unverified, from ${prev.label}): SUCCESS — PIN and settings survived, binary swapped`)
  })
})
