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
export const getAppStoreUrl = (): string => {
  if (Platform.OS === 'ios') {
    return 'https://apps.apple.com/us/app/id1234298467'
  }

  return 'https://play.google.com/store/apps/details?id=ca.bc.gov.id.servicescard'
}
