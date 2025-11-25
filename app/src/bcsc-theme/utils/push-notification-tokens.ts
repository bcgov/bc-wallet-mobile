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
 * unless it fails in which case it returns a dummy fcmDeviceToken and null deviceToken
 */
export const getNotificationTokens = async (logger: BifoldLogger): Promise<NotificationTokens> => {
  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    try {
      logger.debug('Attempting to register device for remote messages...')
      await messaging().registerDeviceForRemoteMessages()
      logger.debug('Device successfully registered for remote messages')
    } catch (error) {
      // This is the extremely rare case react-native-firebase fails to register
      // We log the error but continue with a dummy string as registration will still work
      // it will just mean push notifications won't be received until the next registration update
      logger.error('Failed to register device for remote messages', error as Error)
      return {
        fcmDeviceToken: 'missing_token_due_to_rnf_registration_failure',
        deviceToken: null,
      }
    }
  } else {
    logger.debug('Device already registered for remote messages')
  }

  const fetchFcmToken = async (): Promise<string> => {
    try {
      const token = await messaging().getToken()
      if (!token) {
        throw new Error('FCM token is null or undefined')
      }
      return token
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`FCM token fetch failed: ${message}`)
      return 'missing_token_due_to_fetch_failure' // Return dummy token on failure
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
    const [fcmDeviceToken, deviceToken] = await Promise.all([fetchFcmToken(), fetchDeviceToken()])

    logger.info('Successfully retrieved notification tokens for registration')

    return {
      fcmDeviceToken,
      deviceToken,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to retrieve notification tokens: ${errorMessage}`)
    return {
      fcmDeviceToken: 'missing_token_due_to_fetch_failure',
      deviceToken: null,
    }
  }
}
