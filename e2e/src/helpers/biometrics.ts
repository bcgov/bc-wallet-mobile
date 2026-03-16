import { isSauceLabs } from './sauce.js'

export async function enrollBiometrics() {
  if (isSauceLabs()) {
    await driver.execute('sauce:biometrics', { action: 'enroll' })
  } else if (driver.isIOS) {
    await driver.execute('mobile: enrollBiometric', { isEnabled: true })
  } else {
    // Android emulator: use ADB
    await driver.execute('mobile: shell', {
      command: 'locksettings set-pin 1234',
    })
  }
}

export async function matchBiometric() {
  if (isSauceLabs()) {
    await driver.execute('sauce:biometrics', { action: 'match' })
  } else if (driver.isIOS) {
    await driver.execute('mobile: sendBiometricMatch', { type: 'faceId', match: true })
  }
}
