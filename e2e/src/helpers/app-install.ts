import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCurrentAppId } from './deep-link.js'
import { isSauceLabs } from './sauce.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Mid-session in-place upgrades. The upgrade suites boot a shipped build via their own configs
 * (`PREV_VERSION` → `BCSC-v<version>.*`), then swap in the build under test with `driver.installApp()`.
 * Same application id per variant ⇒ app data (keychain, preferences, secure storage) survives the install.
 */

/** Sauce storage refs and URLs pass through; bare filenames get the storage:filename= prefix. */
export function toSauceAppRef(value: string): string {
  if (value.startsWith('storage:') || value.startsWith('http')) return value
  return `storage:filename=${value}`
}

/**
 * The build under test as an installApp ref: Sauce storage filename on Sauce (ANDROID_APP_FILENAME /
 * IOS_APP_FILENAME), else a local file under e2e/apps/ (ANDROID_APP / IOS_APP_DEVICE) unless given
 * as an explicit remote ref.
 */
export function resolveCurrentBuildRef(): string {
  const onSauce = isSauceLabs()
  let app: string
  if (driver.isAndroid) {
    app = onSauce ? process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.apk' : process.env.ANDROID_APP || 'BCSC.apk'
  } else {
    app = onSauce ? process.env.IOS_APP_FILENAME || 'BCSC-Dev-latest.ipa' : process.env.IOS_APP_DEVICE || 'BCSC.ipa'
  }
  if (onSauce) return toSauceAppRef(app)
  if (app.startsWith('storage:') || app.startsWith('http')) return app
  return resolve(__dirname, '../../apps', app)
}

/**
 * Install the current build over the app `appId` names, running or closed.
 *
 * On Sauce RDC the plain installApp endpoint rejects `storage:` refs (http/https only) — the
 * documented mid-session install path is the `mobile: installApp` execute script, which accepts
 * Sauce Storage refs (and ONLY those; upgrades only, downgrades refuse).
 */
export async function installCurrentBuildOver(appId: string): Promise<string> {
  const appRef = resolveCurrentBuildRef()
  if (isSauceLabs()) {
    await driver.execute('mobile: installApp', { appPath: appRef })
  } else {
    await driver.installApp(appRef)
  }
  return appId
}

/**
 * Install the current build over the RUNNING app and return its app id — captured BEFORE the
 * install, because the platform kills the process on package replace so it cannot be read after.
 */
export async function installCurrentBuildOverRunningApp(): Promise<string> {
  return installCurrentBuildOver(await getCurrentAppId())
}

/**
 * Close the running app and return its id — for the states a user reaches with the app shut (an
 * approval that lands while it is closed), so the install and relaunch still know what to target.
 */
export async function closeRunningApp(): Promise<string> {
  const appId = await getCurrentAppId()
  await driver.terminateApp(appId)
  return appId
}

/** Relaunch after an in-place upgrade: best-effort terminate, then activate the new binary. */
export async function relaunchAfterInstall(appId: string): Promise<void> {
  try {
    await driver.terminateApp(appId)
  } catch {
    console.log('[app-install] terminateApp failed (app may already be stopped)')
  }
  await driver.pause(2_000)
  await driver.activateApp(appId)
  // Let the upgraded app fully initialize before the caller asserts screens.
  await driver.pause(3_000)
}
