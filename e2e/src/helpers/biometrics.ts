import { recoverAppAfterSauceBiometricInteraction } from './appActivation.js'
import { isSauceLabs } from './sauce.js'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function bioLog(message: string): void {
  console.log(`[biometrics] ${message}`)
}

/** Subtitle set in bcsc-core `DeviceAuthenticationService` / `BcscCoreModule.performDeviceAuthentication`. */
const ANDROID_BIOMETRIC_SUBTITLE_SEL = '//android.widget.TextView[contains(@text,"authenticate to continue")]'

/** iOS system biometric sheet (en — adjust if running localized Sauce sessions). */
const IOS_BIOMETRIC_LABEL_SEL =
  '-ios class chain:**/XCUIElementTypeStaticText[`label CONTAINS[c] "Face ID" OR label CONTAINS[c] "Touch ID"`]'

const NATIVE_BIOMETRIC_WAIT_MS = 25_000

/**
 * Sauce RDC only forwards `sauce:biometrics-authenticate` once the native biometric
 * UI is showing. Without this wait, Android often misses the inject.
 */
async function waitForNativeBiometricPromptOnSauceRdc(): Promise<void> {
  if (!isSauceLabs()) return

  if (driver.isAndroid) {
    bioLog(`Sauce RDC: waiting for Android BiometricPrompt (subtitle), timeout ${NATIVE_BIOMETRIC_WAIT_MS}ms`)
    await $(ANDROID_BIOMETRIC_SUBTITLE_SEL).waitForDisplayed({ timeout: NATIVE_BIOMETRIC_WAIT_MS })
    bioLog('Sauce RDC: Android BiometricPrompt is visible')
    return
  }

  if (driver.isIOS) {
    bioLog(`Sauce RDC: waiting for iOS biometric sheet, timeout ${NATIVE_BIOMETRIC_WAIT_MS}ms`)
    await $(IOS_BIOMETRIC_LABEL_SEL).waitForDisplayed({ timeout: NATIVE_BIOMETRIC_WAIT_MS })
    bioLog('Sauce RDC: iOS biometric sheet is visible')
  }
}

/** Local iOS Simulator only (not Sauce Labs, not a USB real device). */
function isLocalIOSSimulator(): boolean {
  if (!driver.isIOS || isSauceLabs()) return false

  const d = driver.capabilities as Record<string, unknown>
  const b = (browser.capabilities ?? {}) as Record<string, unknown>
  const caps = { ...b, ...d }

  if (caps['realDevice'] === true || caps['appium:realDevice'] === true) {
    return false
  }

  const orgId = caps['appium:xcodeOrgId'] ?? caps['xcodeOrgId']
  return typeof orgId !== 'string' || orgId.trim() === ''
}

/**
 * Whether biometric simulation is available in the current test environment.
 * True on iOS Simulators (toggleEnrollTouchId / touchId) and on Sauce Labs
 * (biometricsInterception). False for local real devices and local Android.
 */
export function canSimulateBiometric(): boolean {
  const can = isLocalIOSSimulator() || isSauceLabs()
  bioLog(`canSimulateBiometric=${can} (localIosSim=${isLocalIOSSimulator()}, sauce=${isSauceLabs()})`)
  return can
}

/**
 * Enroll Face ID / Touch ID on the iOS Simulator so the biometric prompt
 * appears instead of the device-passcode fallback. No-op on Sauce Labs
 * (handled by biometricsInterception), real devices, and Android.
 */
export async function enrollBiometric(): Promise<void> {
  if (!isLocalIOSSimulator()) {
    bioLog('enrollBiometric: skip (not local iOS Simulator)')
    return
  }
  bioLog('enrollBiometric: toggleEnrollTouchId(true)')
  await browser.toggleEnrollTouchId(true)
  bioLog('enrollBiometric: done')
}

export async function matchBiometric() {
  if (isSauceLabs()) {
    await delay(2_000)

    bioLog('matchBiometric: Sauce RDC — pass')
    await waitForNativeBiometricPromptOnSauceRdc()
    bioLog('matchBiometric: invoking sauce:biometrics-authenticate=true')
    await driver.execute('sauce:biometrics-authenticate=true')
    bioLog('matchBiometric: recovering app foreground after Sauce biometric')
    await recoverAppAfterSauceBiometricInteraction()
    bioLog('matchBiometric: Sauce RDC — done')
  } else if (isLocalIOSSimulator()) {
    bioLog('matchBiometric: iOS Simulator — touchId(true, faceId)')
    await browser.touchId(true, 'faceId')
    bioLog('matchBiometric: iOS Simulator — done')
  } else {
    bioLog('matchBiometric: no-op (environment does not simulate biometrics)')
  }
}

export async function failBiometric() {
  if (isSauceLabs()) {
    await delay(2_000)

    bioLog('failBiometric: Sauce RDC — fail')
    await waitForNativeBiometricPromptOnSauceRdc()
    bioLog('failBiometric: invoking sauce:biometrics-authenticate=false')
    await driver.execute('sauce:biometrics-authenticate=false')
    bioLog('failBiometric: recovering app foreground after Sauce biometric')
    await recoverAppAfterSauceBiometricInteraction()
    bioLog('failBiometric: Sauce RDC — done')
  } else if (isLocalIOSSimulator()) {
    bioLog('failBiometric: iOS Simulator — touchId(false, faceId)')
    await browser.touchId(false, 'faceId')
    bioLog('failBiometric: iOS Simulator — done')
  } else {
    bioLog('failBiometric: no-op (environment does not simulate biometrics)')
  }
}

/**
 * Accepts a native biometric-related permission when one appears:
 * - iOS Simulator: "Allow Face ID" (Springboard alert).
 * - Android: no-op here. UiAutomator2 does not support `execute('mobile: alert', …)` (unsupported command);
 *   BiometricPrompt is not a WebDriver "alert", so `acceptAlert()` only errors while the sheet is visible.
 *   If a pre-prompt runtime permission ever appears, handle it with an explicit screen object / selector.
 *
 * On SauceLabs iOS RDC with biometricsInterception, the Face ID allow sheet often does not appear.
 */
export async function acceptBiometricPermissionIfPresent(): Promise<void> {
  if (driver.isAndroid) {
    bioLog('acceptBiometricPermissionIfPresent: skip on Android (use matchBiometric / Sauce inject)')
    return
  }

  bioLog('acceptBiometricPermissionIfPresent: waiting 1.5s for Face ID permission alert (if any)')
  await delay(1_500)

  const maxAttempts = 5
  const intervalMs = 1_000

  if (!isLocalIOSSimulator()) {
    bioLog('acceptBiometricPermissionIfPresent: skip (not local iOS Simulator; e.g. Sauce iOS uses RDC interception)')
    return
  }

  bioLog(`acceptBiometricPermissionIfPresent: polling for Allow (up to ${maxAttempts} attempts)`)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Allow' })
      bioLog('acceptBiometricPermissionIfPresent: dismissed via mobile: alert')
      return
    } catch {
      // Alert not present via this API — try Springboard
    }

    try {
      await driver.updateSettings({ defaultActiveApplication: 'com.apple.springboard' })
      const allowButton = await $('~Allow')
      if (await allowButton.isDisplayed()) {
        await allowButton.click()
        bioLog('acceptBiometricPermissionIfPresent: tapped Allow on Springboard')
        return
      }
    } catch {
      // Allow button not found
    } finally {
      await driver.updateSettings({ defaultActiveApplication: 'auto' })
    }

    bioLog(`acceptBiometricPermissionIfPresent: attempt ${attempt + 1}/${maxAttempts} — no Allow yet, retrying…`)
    if (attempt < maxAttempts - 1) await delay(intervalMs)
  }
  bioLog('acceptBiometricPermissionIfPresent: finished without finding Allow')
}
