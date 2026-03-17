import { BCSC_APPLE_STORE_URL, BCSC_GOOGLE_PLAY_STORE_URL } from '@/constants'
import { Linking, Platform } from 'react-native'

export const openLink = async (url: string) => {
  // Only `https://` is allowed. Update manifest as needed.
  const supported = await Linking.canOpenURL(url)

  if (supported) {
    // Will open in device browser.
    await Linking.openURL(url)
  }
}

/**
 * Get the BCSC App Store URL based on the platform.
 *
 * @returns {*} {string} The BCSC app store URL.
 */
export const getBCSCAppStoreUrl = (): string => {
  if (Platform.OS === 'ios') {
    return BCSC_APPLE_STORE_URL
  }

  return BCSC_GOOGLE_PLAY_STORE_URL
}
