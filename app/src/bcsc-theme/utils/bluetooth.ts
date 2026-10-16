import { PermissionsAndroid, Platform } from 'react-native'
import { isBluetoothAudioConnected } from 'react-native-bcsc-core'
import { throwNativeBcscError } from './native-error-map'

/**
 * Checks if the device requires Bluetooth permission (Android API 31+).
 * NOTE: This command can be used to reset the bluetooth permissions for testing purposes: `
 *   adb shell pm revoke ca.bc.gov.id.servicescard.dev android.permission.BLUETOOTH_CONNECT
 *   adb shell pm clear-permission-flags ca.bc.gov.id.servicescard.dev android.permission.BLUETOOTH_CONNECT user-set user-fixed
 *   `
 * @returns `true` if the device requires Bluetooth permission, `false` otherwise.
 * @throws A mapped native error if Bluetooth audio detection fails; callers decide whether that is critical.
 */
export async function deviceRequiresBluetoothPermission(): Promise<boolean> {
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

  let bluetoothAudioConnected: boolean | null = null

  try {
    bluetoothAudioConnected = await isBluetoothAudioConnected()
  } catch (error) {
    return throwNativeBcscError(error)
  }

  if (!bluetoothAudioConnected) {
    // No Bluetooth audio connected, so no need to request permission
    return false
  }

  // Device requires Bluetooth permission and it has not been granted yet
  return true
}
