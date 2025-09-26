import { Platform } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import { RemoteLogger } from '@bifold/remote-logs'

export const getNotificationTokens = async (logger?: RemoteLogger) => {
  const fcmDeviceToken = await messaging().getToken()
  if (!fcmDeviceToken) {
    logger?.error('Failed to retrieve FCM device token for registration')
    throw new Error('FCM device token is required for registration')
  }

  // On iOS, we also need the APNs token for registration
  let apnsToken: string | undefined
  if (Platform.OS === 'ios') {
    apnsToken = (await messaging().getAPNSToken()) ?? undefined

    if (!apnsToken) {
      logger?.error('Failed to retrieve APNS token for registration')
      throw new Error('APNS token is required for registration on iOS')
    }
  }

  return { fcmDeviceToken, apnsToken }
}
