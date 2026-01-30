import { BifoldLogger } from '@bifold/core'
import { getApp } from '@react-native-firebase/app'
import {
  getAPNSToken,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging'
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
  const messagingInstance = getMessaging(getApp())
  if (!isDeviceRegisteredForRemoteMessages(messagingInstance)) {
    try {
      logger.debug('[PushTokens] Attempting to register device for remote messages...')
      await registerDeviceForRemoteMessages(messagingInstance)
      logger.debug('[PushTokens] Device successfully registered for remote messages')
    } catch (error) {
      // This is the extremely rare case react-native-firebase fails to register
      // We log the error but continue with a dummy string as registration will still work
      // it will just mean push notifications won't be received until the next registration update
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[PushTokens] Failed to register device for remote messages: ${message}`)
      return {
        fcmDeviceToken: 'missing_token_due_to_rnf_registration_failure',
        deviceToken: null,
      }
    }
  } else {
    logger.debug('[PushTokens] Device already registered for remote messages')
  }

  const fetchFcmToken = async (): Promise<string> => {
    try {
      const token = await getToken(messagingInstance)
      if (!token) {
        throw new Error('FCM token is null or undefined')
      }
      return token
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[PushTokens] FCM token fetch failed: ${message}`)
      return 'missing_token_due_to_fetch_failure' // Return dummy token on failure
    }
  }

  const fetchDeviceToken = async (): Promise<string | null> => {
    if (Platform.OS !== 'ios') {
      return null // Android doesn't need APNS token
    }

    try {
      const token = await getAPNSToken(messagingInstance)
      // treat all falsey values including empty strings as null
      return token || null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`[PushTokens] APNS token fetch failed: ${message}`)
      return null // APNS token is optional, don't fail the entire process
    }
  }

  const [fcmDeviceToken, deviceToken] = await Promise.all([fetchFcmToken(), fetchDeviceToken()])

  logger.info('[PushTokens] Successfully retrieved notification tokens for registration')

  return {
    fcmDeviceToken,
    deviceToken,
  }
}
