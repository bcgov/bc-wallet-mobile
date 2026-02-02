import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { Platform } from 'react-native'

// Mock the messaging module (modular API)
const mockGetToken = jest.fn()
const mockGetAPNSToken = jest.fn()
const mockRegisterDeviceForRemoteMessages = jest.fn()
const mockIsDeviceRegisteredForRemoteMessages = jest.fn()

const mockMessagingInstance = {}

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}))

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => mockMessagingInstance),
  getToken: jest.fn(() => mockGetToken()),
  getAPNSToken: jest.fn(() => mockGetAPNSToken()),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => mockIsDeviceRegisteredForRemoteMessages()),
  registerDeviceForRemoteMessages: jest.fn(() => mockRegisterDeviceForRemoteMessages()),
}))

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // Default to iOS, will override in specific tests
  },
}))

// Create a mock logger that satisfies the BifoldLogger interface
const mockLogger = {
  // Methods used by the function under test
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),

  // Additional methods from BifoldLogger interface (not used but required for typing)
  logLevel: 0,
  isEnabled: jest.fn().mockReturnValue(true),
  test: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  report: jest.fn(),
  log: jest.fn(),
} as any // Use 'as any' to bypass private property type checking

// Helper to set platform OS in a type-safe way
const setPlatformOS = (os: 'ios' | 'android' | 'web') => {
  Object.defineProperty(Platform, 'OS', {
    writable: true,
    value: os,
  })
}

describe('getNotificationTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset Platform.OS to iOS for most tests
    setPlatformOS('ios')
    // Default to device already registered (most common case)
    mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true)
  })

  describe('when successful', () => {
    it('returns both FCM and APNS tokens on iOS', async () => {
      const mockFCMToken = 'mock_fcm_token_123'
      const mockAPNSToken = 'mock_apns_token_456'

      mockGetToken.mockResolvedValue(mockFCMToken)
      mockGetAPNSToken.mockResolvedValue(mockAPNSToken)

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: mockFCMToken,
        deviceToken: mockAPNSToken,
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[PushTokens] Successfully retrieved notification tokens for registration'
      )
    })

    it('returns only FCM token on Android (no APNS token needed)', async () => {
      setPlatformOS('android')
      const mockFCMToken = 'mock_fcm_token_android'

      mockGetToken.mockResolvedValue(mockFCMToken)
      // APNS should not be called on Android
      mockGetAPNSToken.mockResolvedValue(null)

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: mockFCMToken,
        deviceToken: null,
      })
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[PushTokens] Successfully retrieved notification tokens for registration'
      )
    })
  })

  describe('when FCM token fails', () => {
    it('returns dummy token when FCM token is null', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

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
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(undefined)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
    })

    it('returns dummy token when FCM token fetch throws exception', async () => {
      setPlatformOS('ios')
      const mockError = new Error('FCM service unavailable')
      mockGetToken.mockRejectedValue(mockError)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
      expect(mockLogger.error).toHaveBeenCalledWith('[PushTokens] FCM token fetch failed: FCM service unavailable')
    })

    it('succeeds with null deviceToken when APNS token is null on iOS', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue(null)

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
    })

    it('succeeds with null deviceToken when APNS token fetch throws exception on iOS', async () => {
      setPlatformOS('ios')
      const mockError = new Error('APNS service unavailable')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockRejectedValue(mockError)

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
      expect(mockLogger.warn).toHaveBeenCalledWith('[PushTokens] APNS token fetch failed: APNS service unavailable')
    })

    it('returns dummy FCM token when FCM fails even if APNS succeeds', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
    })

    it('handles non-Error exceptions (string messages)', async () => {
      setPlatformOS('ios')
      mockGetToken.mockRejectedValue('String error message')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
      expect(mockLogger.error).toHaveBeenCalledWith('[PushTokens] FCM token fetch failed: String error message')
    })
  })

  describe('platform-specific behavior', () => {
    it('does not call getAPNSToken on Android', async () => {
      setPlatformOS('android')
      mockGetToken.mockResolvedValue('mock_fcm_token')

      await getNotificationTokens(mockLogger)

      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })

    it('calls getAPNSToken on iOS', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await getNotificationTokens(mockLogger)

      expect(mockGetAPNSToken).toHaveBeenCalled()
    })

    it('treats unknown platforms as non-iOS (no APNS token)', async () => {
      setPlatformOS('web')
      mockGetToken.mockResolvedValue('mock_fcm_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result.deviceToken).toBe(null)
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })
  })

  describe('edge cases with empty strings', () => {
    it('treats empty string FCM token as invalid and returns dummy token', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'missing_token_due_to_fetch_failure',
        deviceToken: 'mock_apns_token',
      })
    })

    it('succeeds with null deviceToken when APNS token is empty string on iOS', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('')

      const result = await getNotificationTokens(mockLogger)

      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: null,
      })
    })
  })

  describe('device registration for remote messages', () => {
    it('does not register when device is already registered', async () => {
      setPlatformOS('ios')
      mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(true)
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await getNotificationTokens(mockLogger)

      expect(mockRegisterDeviceForRemoteMessages).not.toHaveBeenCalled()
    })

    it('registers device when not registered and succeeds', async () => {
      setPlatformOS('ios')
      mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(false)
      mockRegisterDeviceForRemoteMessages.mockResolvedValue(undefined)
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(mockRegisterDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token',
        deviceToken: 'mock_apns_token',
      })
    })

    it('continues with token fetch even if registration fails', async () => {
      setPlatformOS('ios')
      mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(false)
      mockRegisterDeviceForRemoteMessages.mockRejectedValue(new Error('Registration failed'))
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens(mockLogger)

      expect(mockRegisterDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
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
      mockIsDeviceRegisteredForRemoteMessages.mockReturnValue(false)
      mockRegisterDeviceForRemoteMessages.mockResolvedValue(undefined)
      mockGetToken.mockResolvedValue('mock_fcm_token_android')

      const result = await getNotificationTokens(mockLogger)

      expect(mockRegisterDeviceForRemoteMessages).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        fcmDeviceToken: 'mock_fcm_token_android',
        deviceToken: null,
      })
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })
  })
})
