import { isSauceLabs } from './sauce.js'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function enrollBiometrics() {
  if (isSauceLabs()) {
    await driver.execute('sauce:biometrics', { action: 'enroll' })
  } else if (driver.isIOS) {
    await driver.execute('mobile: enrollBiometric', { isEnabled: true })
  } else {
    await driver.execute('mobile: shell', {
      command: 'locksettings set-pin 1234',
    })
  }
}

export async function matchBiometric() {
  if (isSauceLabs()) {
    await driver.execute('sauce:biometrics-authenticate=true')
  } else if (driver.isIOS) {
    await driver.execute('mobile: sendBiometricMatch', { type: 'faceId', match: true })
  }
}

export async function failBiometric() {
  if (isSauceLabs()) {
    await driver.execute('sauce:biometrics-authenticate=false')
  } else if (driver.isIOS) {
    await driver.execute('mobile: sendBiometricMatch', { type: 'faceId', match: false })
  }
}

/**
 * Accepts the native iOS "Do you want to allow <App> to use Face ID?" permission dialog.
 * This system alert appears the first time the app calls LAContext.evaluatePolicy().
 * On SauceLabs RDC with biometricsInterception, this dialog does not appear.
 * On Android, biometric enrollment does not trigger a permission dialog.
 */
export async function acceptBiometricPermissionIfPresent(): Promise<void> {
  if (!driver.isIOS) return
  if (isSauceLabs()) return

  await delay(1_500)

  const maxAttempts = 5
  const intervalMs = 1_000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Try the mobile: alert API first (handles most system dialogs)
    try {
      await driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Allow' })
      return
    } catch {
      // Alert not present via this API — try Springboard
    }

    // Fallback: biometric permission dialogs are Springboard-managed
    try {
      await driver.updateSettings({ defaultActiveApplication: 'com.apple.springboard' })
      const allowButton = await $('~Allow')
      if (await allowButton.isDisplayed()) {
        await allowButton.click()
        return
      }
    } catch {
      // Allow button not found
    } finally {
      await driver.updateSettings({ defaultActiveApplication: 'auto' })
    }

    if (attempt < maxAttempts - 1) await delay(intervalMs)
  }
}
