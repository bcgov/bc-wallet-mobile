import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { annotate } from '../../../src/helpers/sauce.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isSauceRun = Boolean(process.env.SAUCE_USERNAME)

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
 */
describe('Upgrade v3 → v4', () => {
  it('should install the v4 app over v3', async () => {
    await annotate('Migration: Upgrading v3 → v4')

    let v4App: string
    if (driver.isAndroid) {
      if (isSauceRun) {
        v4App = process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.aab'
      } else {
        v4App = process.env.ANDROID_APP || 'BCSC.apk'
      }
    } else {
      if (isSauceRun) {
        v4App = process.env.IOS_APP_FILENAME || 'BCSC-Dev-latest.ipa'
      } else {
        v4App = process.env.IOS_APP_DEVICE || 'BCSC.ipa'
      }
    }

    let appRef: string
    if (isSauceRun) {
      appRef = toSauceAppRef(v4App)
    } else if (v4App.startsWith('storage:') || v4App.startsWith('http')) {
      // Local run with explicit remote reference
      appRef = v4App
    } else {
      // Local device — resolve to an absolute file path under e2e/apps/
      appRef = resolve(__dirname, '../../../../apps', v4App)
    }

    console.log(`[migration] Installing v4 app: ${appRef}`)
    await driver.installApp(appRef)
    console.log('[migration] v4 app installed successfully')
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
    console.log('[migration] v4 app launched')

    // Wait for the app to fully initialize
    await driver.pause(3_000)
  })
})
