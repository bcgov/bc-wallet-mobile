import type { DeviceSecurityUnlockResult } from 'react-native-bcsc-core'

export type DeviceAuthFailureCause = 'lockout' | 'interrupted' | 'generic'

// androidx BiometricPrompt.ERROR_CANCELED / ERROR_LOCKOUT / ERROR_LOCKOUT_PERMANENT / ERROR_USER_CANCELED
const ANDROID_ERROR_CANCELED = 5
const ANDROID_ERROR_LOCKOUT = 7
const ANDROID_ERROR_LOCKOUT_PERMANENT = 9
const ANDROID_ERROR_USER_CANCELED = 10

// LAError.Code.systemCancel / biometryLockout
const IOS_SYSTEM_CANCEL = -4
const IOS_BIOMETRY_LOCKOUT = -8

/**
 * Classifies a non-cancel device-auth failure so the user sees actionable copy.
 * Code 10 while the device is locked is the OS lock screen taking over the prompt after repeated
 * failed attempts, not a deliberate cancel.
 */
export const getDeviceAuthFailureCause = (
  result: Pick<DeviceSecurityUnlockResult, 'errorCode' | 'deviceLocked'>,
  platform: 'ios' | 'android' | string
): DeviceAuthFailureCause => {
  const { errorCode, deviceLocked } = result

  if (platform === 'android') {
    if (
      errorCode === ANDROID_ERROR_LOCKOUT ||
      errorCode === ANDROID_ERROR_LOCKOUT_PERMANENT ||
      (errorCode === ANDROID_ERROR_USER_CANCELED && deviceLocked === true)
    ) {
      return 'lockout'
    }

    return errorCode === ANDROID_ERROR_CANCELED ? 'interrupted' : 'generic'
  }

  if (platform === 'ios') {
    if (errorCode === IOS_BIOMETRY_LOCKOUT) {
      return 'lockout'
    }

    return errorCode === IOS_SYSTEM_CANCEL ? 'interrupted' : 'generic'
  }

  return 'generic'
}
