import { BifoldLogger } from '@bifold/core'
import messaging from '@react-native-firebase/messaging'
import { Platform } from 'react-native'

// Define a structured return type for clarity
export interface NotificationTokens {
  fcmDeviceToken: string
  deviceToken: string | null // Device token (APNS token on iOS, null on Android)
}

/**
 * Retrieves the tokens associated with push notifications. fcmDeviceToken is required,
 * deviceToken (APNS) is optional and iOS only.
 * @param logger
 * @returns NotificationTokens object containing fcmDeviceToken and deviceToken
 * @throws with the failure message if no fcmDeviceToken is not retrieved
 */
export const getNotificationTokens = async (logger: BifoldLogger): Promise<NotificationTokens> => {
  const fetchFcmToken = async (): Promise<string> => {
    try {
      const token = await messaging().getToken()
      if (!token) {
        throw new Error('FCM token is null or undefined')
      }
      return token
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`FCM token fetch failed: ${message}`)
    }
  }

  const fetchDeviceToken = async (): Promise<string | null> => {
    if (Platform.OS !== 'ios') {
      return null // Android doesn't need APNS token
    }

    try {
      const token = await messaging().getAPNSToken()
      // treat all falsey values including empty strings as null
      return token || null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`APNS token fetch failed: ${message}`)
      return null // APNS token is optional, don't fail the entire process
    }
  }

  try {
    const [fcmToken, deviceToken] = await Promise.all([fetchFcmToken(), fetchDeviceToken()])

    logger.info('Successfully retrieved notification tokens for registration')

    return {
      fcmDeviceToken: fcmToken,
      deviceToken,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to retrieve notification tokens: ${errorMessage}`)
    throw new Error(errorMessage)
  }
}
