import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { MockLogger } from '@bifold/core'
import {
  getAPNSToken,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging'
import { Platform } from 'react-native'

jest.mock('@react-native-firebase/app')
jest.mock('@react-native-firebase/messaging')

const originalPlatformOS = Platform.OS

const setPlatformOS = (os: 'ios' | 'android' | 'web') => {
  Object.defineProperty(Platform, 'OS', { writable: true, value: os })
}

describe('getNotificationTokens', () => {
  let mockLogger: MockLogger

  beforeEach(() => {
    mockLogger = new MockLogger()
    setPlatformOS('ios')
    // The shared manual mock keeps its implementation across `clearMocks`, so re-state the
    // happy-path defaults here rather than inheriting whatever the previous test set.
    jest.mocked(isDeviceRegisteredForRemoteMessages).mockReturnValue(true)
    jest.mocked(registerDeviceForRemoteMessages).mockResolvedValue(undefined)
    jest.mocked(getToken).mockResolvedValue('mock_fcm_token')
    jest.mocked(getAPNSToken).mockResolvedValue(null)
  })

  afterEach(() => {
    setPlatformOS(originalPlatformOS as 'ios' | 'android' | 'web')
  })

  describe('when successful', () => {
    it('returns both FCM and APNS tokens on iOS', async () => {
      jest.mocked(getToken).mockResolvedValue('mock_fcm_token_123')
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token_456')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token_123',
        deviceToken: 'mock_apns_token_456',
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[PushTokens] Successfully retrieved notification tokens for registration'
      )
    })

    it('returns only FCM token on Android (no APNS token needed)', async () => {
      setPlatformOS('android')
      jest.mocked(getToken).mockResolvedValue('mock_fcm_token_android')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token_android',
        deviceToken: null,
      })
      expect(getAPNSToken).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[PushTokens] Successfully retrieved notification tokens for registration'
      )
    })
  })

  describe('when FCM token fails', () => {
    it('returns dummy token when FCM token is null', async () => {
      jest.mocked(getToken).mockResolvedValue(null as unknown as string)
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[PushTokens] FCM token fetch failed: FCM token is null or undefined'
      )
    })

    it('returns dummy token when FCM token is undefined', async () => {
      jest.mocked(getToken).mockResolvedValue(undefined as unknown as string)
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
    })

    it('returns dummy token when FCM token fetch throws exception', async () => {
      jest.mocked(getToken).mockRejectedValue(new Error('FCM service unavailable'))
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
      expect(mockLogger.error).toHaveBeenCalledWith('[PushTokens] FCM token fetch failed: FCM service unavailable')
    })

    it('succeeds with null deviceToken when APNS token is null on iOS', async () => {
      jest.mocked(getAPNSToken).mockResolvedValue(null)

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
    })

    it('succeeds with null deviceToken when APNS token fetch throws exception on iOS', async () => {
      jest.mocked(getAPNSToken).mockRejectedValue(new Error('APNS service unavailable'))

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
      expect(mockLogger.warn).toHaveBeenCalledWith('[PushTokens] APNS token fetch failed: APNS service unavailable')
    })

    it('handles non-Error exceptions (string messages)', async () => {
      jest.mocked(getToken).mockRejectedValue('String error message')
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
      expect(mockLogger.error).toHaveBeenCalledWith('[PushTokens] FCM token fetch failed: String error message')
    })
  })

  describe('platform-specific behavior', () => {
    it('calls getAPNSToken on iOS', async () => {
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      await getNotificationTokens(mockLogger)

      expect(getAPNSToken).toHaveBeenCalled()
    })

    it('treats unknown platforms as non-iOS (no APNS token)', async () => {
      setPlatformOS('web')

      const result = await getNotificationTokens(mockLogger)

      expect(result.deviceToken).toBe(null)
      expect(getAPNSToken).not.toHaveBeenCalled()
    })
  })

  describe('edge cases with empty strings', () => {
    it('treats empty string FCM token as invalid and returns dummy token', async () => {
      jest.mocked(getToken).mockResolvedValue('')
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
    })

    it('succeeds with null deviceToken when APNS token is empty string on iOS', async () => {
      jest.mocked(getAPNSToken).mockResolvedValue('')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
    })
  })

  describe('device registration for remote messages', () => {
    it('does not register when device is already registered', async () => {
      jest.mocked(isDeviceRegisteredForRemoteMessages).mockReturnValue(true)

      await getNotificationTokens(mockLogger)

      expect(registerDeviceForRemoteMessages).not.toHaveBeenCalled()
    })

    it('registers device when not registered and succeeds', async () => {
      jest.mocked(isDeviceRegisteredForRemoteMessages).mockReturnValue(false)
      jest.mocked(getAPNSToken).mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(registerDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: 'mock_apns_token',
      })
    })

    it('continues with token fetch even if registration fails', async () => {
      jest.mocked(isDeviceRegisteredForRemoteMessages).mockReturnValue(false)
      jest.mocked(registerDeviceForRemoteMessages).mockRejectedValue(new Error('Registration failed'))

      const result = await getNotificationTokens(mockLogger)

      expect(registerDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[PushTokens] Failed to register device for remote messages: Registration failed'
      )
      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_rnf_registration_failure',
        deviceToken: null,
      })
    })

    it('works on Android when device is not registered', async () => {
      setPlatformOS('android')
      jest.mocked(isDeviceRegisteredForRemoteMessages).mockReturnValue(false)
      jest.mocked(getToken).mockResolvedValue('mock_fcm_token_android')

      const result = await getNotificationTokens(mockLogger)

      expect(registerDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token_android',
        deviceToken: null,
      })
      expect(getAPNSToken).not.toHaveBeenCalled()
    })
  })
})
