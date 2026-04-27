import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { annotate, isSauceLabs } from '../../../src/helpers/sauce.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function toSauceAppRef(value: string): string {
  if (value.startsWith('storage:') || value.startsWith('http')) return value
  return `storage:filename=${value}`
}

/**
 * Upgrade from v3 (BC Services Card) to v4 (BC Wallet / BCSC v4).
 *
 * Uses `driver.installApp()` to install the v4 build over the existing v3 app.
 * Both apps share the same application/bundle ID per variant — for the Dev
 * variant used by e2e tests this is `ca.bc.gov.id.servicescard.dev` (Android)
 * and `ca.bc.gov.iddev.servicescard` (iOS). Because the IDs match, this is an
 * in-place upgrade — app data (keychain, shared preferences,
 * secure storage) is preserved across the install.
 *
 * On Sauce Labs the app reference should be a `storage:filename=...` value or URL.
 * For local device runs it must be a local file path (resolved relative to e2e/apps/).
 *
 * NOTE: iOS upgrade is skipped on Sauce public RDC because mid-test
 * `installApp()` bypasses Sauce's resigning pipeline, and Apple rejects
 * unsigned IPAs on public devices. Run the iOS migration suite locally, or
 * on Sauce private devices with pre-signed IPAs.
 */
describe('Upgrade v3 → v4', () => {
  before(function () {
    if (isSauceLabs() && driver.isIOS) {
      console.log('[migration] Skipping iOS upgrade on Sauce — see spec header for details')
      this.skip()
    }
  })

  it('should install the v4 app over v3', async () => {
    await annotate('Migration: Upgrading v3 → v4')

    const onSauce = isSauceLabs()
    let v4App: string
    if (driver.isAndroid) {
      if (onSauce) {
        v4App = process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.apk'
      } else {
        v4App = process.env.ANDROID_APP || 'BCSC.apk'
      }
    } else {
      v4App = process.env.IOS_APP_DEVICE || 'BCSC.ipa'
    }

    let appRef: string
    if (onSauce) {
      appRef = toSauceAppRef(v4App)
    } else if (v4App.startsWith('storage:') || v4App.startsWith('http')) {
      // Local run with explicit remote reference
      appRef = v4App
    } else {
      // Local device — resolve to an absolute file path under e2e/apps/
      appRef = resolve(__dirname, '../../../apps', v4App)
    }

    await driver.installApp(appRef)
    console.log('[migration] Installed v4 app over v3 successfully')
  })

  it('should terminate and relaunch the app as v4', async () => {
    // The bundle/package ID is the same for v3 and v4 (bcsc-dev variant)
    const bundleId = driver.isIOS ? 'ca.bc.gov.iddev.servicescard' : 'ca.bc.gov.id.servicescard.dev'

    try {
      await driver.terminateApp(bundleId)
    } catch {
      console.log('[migration] terminateApp failed (app may already be stopped)')
    }

    await driver.pause(2_000)
    await driver.activateApp(bundleId)

    // Wait for the app to fully initialize
    await driver.pause(3_000)
  })
})
