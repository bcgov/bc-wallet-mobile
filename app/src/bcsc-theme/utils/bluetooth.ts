import { PermissionsAndroid, Platform } from 'react-native'
import { isBluetoothAudioConnected } from 'react-native-bcsc-core'

/**
 * Requests Bluetooth permission on Android 12 and above if Bluetooth audio is connected.
 * @param logger - The logger instance to log warnings and errors.
 * @returns A promise that resolves to `true` if the permission is granted or not needed, and `false` otherwise.
 */
export async function requestBluetoothPermission(): Promise<boolean> {
  // NOTE: Will return immediately if the permission has already been granted
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)

  return result === PermissionsAndroid.RESULTS.GRANTED
}

/**
 * Checks if the device requires Bluetooth permission (Android API 31+).
 * @returns `true` if the device requires Bluetooth permission, `false` otherwise.
 */
export async function shouldRequestBluetoothPermission(): Promise<boolean> {
  const needsRuntimePermission = Platform.OS === 'android' && Platform.Version >= 31

  if (!needsRuntimePermission) {
    // No runtime permission needed for Bluetooth on this platform/version
    return false
  }

  const hasBluetoothPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)

  if (hasBluetoothPermission) {
    // Permission already granted, no need to request again
    return false
  }

  const bluetoothAudioConnected = await isBluetoothAudioConnected()

  if (!bluetoothAudioConnected) {
    // No Bluetooth audio connected, so no need to request permission
    return false
  }

  // Device requires Bluetooth permission and it has not been granted yet
  return true
}
