import { Platform } from 'react-native'
import messaging from '@react-native-firebase/messaging'

export const getNotificationTokens = async () => {
  const fcmDeviceToken = await messaging().getToken()
  if (!fcmDeviceToken) {
    throw new Error('FCM device token is required for registration')
  }

  // On iOS, we also need the APNs token for registration
  let apnsToken: string | undefined
  if (Platform.OS === 'ios') {
    apnsToken = (await messaging().getAPNSToken()) ?? undefined
    if (!apnsToken) {
      throw new Error('APNS token is required for registration on iOS')
    }
  }
  return { fcmDeviceToken, apnsToken }
}
