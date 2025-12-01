import { Platform } from 'react-native'

/**
 * Selects a value based on the current operating system (iOS or Android).
 *
 * @template T - The type of the values.
 * @param {{ios: T; android: T}} values - An object containing values for iOS and Android.
 * @returns {*} {T} The value corresponding to the current platform.
 */
export const selectOS = <T>(values: { ios: T; android: T }): T => {
  switch (Platform.OS) {
    case 'ios':
      return values.ios
    case 'android':
      return values.android
    default:
      throw new Error(`Unsupported platform: ${Platform.OS}`)
  }
}
