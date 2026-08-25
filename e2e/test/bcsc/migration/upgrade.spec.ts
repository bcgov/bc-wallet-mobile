import { installCurrentBuildOverRunningApp, relaunchAfterInstall } from '../../../src/helpers/app-install.js'
import { annotate } from '../../../src/helpers/sauce.js'

/**
 * Upgrade from v3 (BC Services Card) to v4 (BC Wallet / BCSC v4).
 *
 * Uses `driver.installApp()` to install the v4 build over the existing v3 app. Both apps share
 * the same application/bundle id per variant, so this is an in-place upgrade — app data
 * (keychain, shared preferences, secure storage) is preserved across the install. The id is
 * captured from the RUNNING v3 app before the install (the platform kills the process on package
 * replace). Build refs and the install/relaunch mechanics live in `src/helpers/app-install.ts`,
 * shared with the previous-release upgrade suite.
 *
 * NOTE: iOS upgrade is skipped on Sauce public RDC because mid-test `installApp()` bypasses
 * Sauce's resigning pipeline, and Apple rejects unsigned IPAs on public devices. Run the iOS
 * migration suite locally, or on Sauce private devices with pre-signed IPAs.
 */
describe('Upgrade v3 → v4', () => {
  let appId: string | undefined

  it('should install the v4 app over v3', async () => {
    await annotate('Migration: Upgrading v3 → v4')
    appId = await installCurrentBuildOverRunningApp()
    console.log('[migration] Installed v4 app over v3 successfully')
  })

  it('should terminate and relaunch the app as v4', async () => {
    if (!appId) throw new Error('install step did not record the app id')
    await relaunchAfterInstall(appId)
  })
})
