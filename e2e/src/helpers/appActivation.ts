import { getE2EConfig } from '../e2eConfig.js'
import { isSauceLabs } from './sauce.js'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Bundle id (iOS) or application id (Android) for the app under test.
 * Override with `IOS_BUNDLE_ID` / `ANDROID_PACKAGE_NAME` when your build
 * does not match the default for the selected VARIANT (e.g. QA vs dev).
 */
export function getAppIdForActivation(): string {
  const { variant } = getE2EConfig()

  if (driver.isIOS) {
    const fromEnv = process.env.IOS_BUNDLE_ID || process.env.E2E_IOS_BUNDLE_ID
    if (fromEnv) return fromEnv
    return variant === 'bc-wallet' ? 'ca.bc.gov.BCWallet' : 'ca.bc.gov.iddev.servicescard'
  }

  const fromEnv = process.env.ANDROID_PACKAGE_NAME || process.env.E2E_ANDROID_PACKAGE
  if (fromEnv) return fromEnv
  return variant === 'bc-wallet' ? 'ca.bc.gov.BCWallet' : 'ca.bc.gov.id.servicescard.dev'
}

/** True if the AUT is the current foreground app (best-effort; uses Appium mobile commands). */
export async function isAppUnderTestInForeground(): Promise<boolean> {
  const appId = getAppIdForActivation()
  try {
    if (driver.isIOS) {
      const info = (await driver.execute('mobile: activeAppInfo')) as { bundleId?: string }
      return info.bundleId === appId
    }
    const current = await driver.getCurrentPackage()
    return current === appId
  } catch {
    return false
  }
}

export async function bringAppUnderTestToForeground(): Promise<void> {
  const appId = getAppIdForActivation()
  if (driver.isIOS) {
    await driver.execute('mobile: activateApp', { bundleId: appId })
  } else {
    await driver.execute('mobile: activateApp', { appId })
  }
}

/**
 * Sauce Labs biometric interception can background the app or leave Springboard
 * in the foreground. Reactivate the AUT before the next UI command.
 *
 * If repeated `activateApp` calls do not work (process terminated), performs one
 * cold `launchApp` on iOS only — **this may reset in-memory app state** if the
 * OS actually killed the process; prefer fixing native/resigning issues when possible.
 */
export async function recoverAppAfterSauceBiometricInteraction(): Promise<void> {
  if (!isSauceLabs()) return

  const appId = getAppIdForActivation()
  await delay(2_000)

  const maxRounds = 6
  for (let i = 0; i < maxRounds; i++) {
    if (await isAppUnderTestInForeground()) return

    try {
      await bringAppUnderTestToForeground()
    } catch {
      // keep trying
    }
    await delay(1_000)
  }

  if (await isAppUnderTestInForeground()) return

  try {
    if (driver.isIOS) {
      await driver.execute('mobile: launchApp', { bundleId: appId })
    } else {
      await driver.execute('mobile: launchApp', { appId })
    }
    await delay(2_000)
  } catch {
    // Caller will fail on the next waitFor
  }
}
