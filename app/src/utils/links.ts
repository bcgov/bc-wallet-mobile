import { BCSC_APPLE_STORE_URL, BCSC_GOOGLE_PLAY_STORE_URL } from '@/constants'
import { Linking, Platform } from 'react-native'
import { appLogger } from './logger'

/**
 * Opens a URL in the device browser. Every call site is a user-initiated navigation where a dead
 * link should degrade to a no-op, so failures are logged rather than rethrown — callers may safely
 * leave the returned promise unawaited.
 */
export const openLink = async (url: string) => {
  try {
    // Only `https://` is allowed. Update manifest as needed.
    const supported = await Linking.canOpenURL(url)

    if (!supported) {
      appLogger.warn(`Unable to open unsupported URL: ${url}`)
      return
    }

    // Will open in device browser.
    await Linking.openURL(url)
  } catch (error) {
    appLogger.error(`Failed to open URL: ${url}`, error instanceof Error ? error : new Error(String(error)))
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
