import { BifoldLogger } from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import { Platform } from 'react-native'

// Define a structured return type for clarity
export interface NotificationTokens {
  fcmDeviceToken: string
  apnsToken: string | null // Null if iOS fails or if on Android
  success: boolean
  error?: string // Only present if the overall process failed
}

export const getNotificationTokens = async (logger?: BifoldLogger): Promise<NotificationTokens> => {
  let fcmToken: string | null = null
  let apnsToken: string | null = null
  const errors: string[] = []

  // Fetch FCM Token
  try {
    fcmToken = await messaging().getToken()
    if (!fcmToken) {
      errors.push('FCM token fetch failed (returned null/undefined)')
    }
  } catch (e) {
    errors.push(`FCM token fetch failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Fetch APNs Token (iOS only)
  if (Platform.OS === 'ios') {
    try {
      // The getAPNSToken() call should resolve to a string or null/undefined
      apnsToken = (await messaging().getAPNSToken()) ?? null
      if (!apnsToken) {
        errors.push('APNS token fetch failed (returned null/undefined on iOS)')
      }
    } catch (e) {
      errors.push(`APNS token fetch failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 3. Evaluate Results and Log
  if (fcmToken && (Platform.OS !== 'ios' || apnsToken)) {
    // SUCCESS: We have the required token(s)
    logger?.info('Retrieved all required notification tokens for registration.')
    return {
      fcmDeviceToken: fcmToken,
      apnsToken: apnsToken,
      success: true,
    }
  } else {
    // FAILURE: Log all gathered errors
    const errorMessage = `Failed to retrieve required tokens. Errors: ${errors.join('; ')}`
    logger?.error(errorMessage)

    // Fail Fast: Throw an error specific to the token registration requirements
    throw new Error(errorMessage)
  }
}
