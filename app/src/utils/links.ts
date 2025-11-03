import { appleAppStoreUrl, googlePlayStoreUrl } from '@/constants'
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
 * Get the App Store URL based on the platform.
 *
 * @return {string} The App Store URL.
 */
export const getPlatformStoreUrl = (): string => {
  if (Platform.OS === 'ios') {
    return appleAppStoreUrl
  }

  return googlePlayStoreUrl
}
