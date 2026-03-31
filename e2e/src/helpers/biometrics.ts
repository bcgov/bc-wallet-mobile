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

export async function matchBiometric() {
  if (!isSauceLabs()) return
  await delay(2_000)

  bioLog('matchBiometric: waiting for native biometric prompt on Sauce RDC')
  await waitForNativeBiometricPromptOnSauceRdc()
  bioLog('matchBiometric: invoking sauce:biometrics-authenticate=true')
  await driver.execute('sauce:biometrics-authenticate=true')
  bioLog('matchBiometric: Sauce RDC — done')

  await delay(2_000)
}

export async function failBiometric() {
  if (!isSauceLabs()) return
  await delay(2_000)

  bioLog('failBiometric: Sauce RDC — fail')
  await waitForNativeBiometricPromptOnSauceRdc()
  bioLog('failBiometric: invoking sauce:biometrics-authenticate=false')
  await driver.execute('sauce:biometrics-authenticate=false')
  bioLog('failBiometric: Sauce RDC — done')

  await delay(2_000)
}
