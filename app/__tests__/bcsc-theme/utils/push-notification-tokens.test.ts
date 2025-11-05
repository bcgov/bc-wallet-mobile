import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { Platform } from 'react-native'

// Mock the messaging module
const mockGetToken = jest.fn()
const mockGetAPNSToken = jest.fn()

jest.mock('@react-native-firebase/messaging', () => {
  return jest.fn(() => ({
    getToken: mockGetToken,
    getAPNSToken: mockGetAPNSToken,
  }))
})

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
        apnsToken: mockAPNSToken,
        success: true,
      })
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved all required notification tokens for registration.')
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
        apnsToken: null,
        success: true,
      })
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved all required notification tokens for registration.')
    })
  })

  describe('when FCM token fails', () => {
    it('throws error when FCM token is null', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
    })

    it('throws error when FCM token is undefined', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(undefined)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
    })

    it('throws error when FCM token fetch throws exception', async () => {
      setPlatformOS('ios')
      const mockError = new Error('FCM service unavailable')
      mockGetToken.mockRejectedValue(mockError)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed: FCM service unavailable'
      )
    })

    it('throws error when APNS token is null on iOS', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue(null)

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: APNS token fetch failed (returned null/undefined on iOS)'
      )
    })

    it('throws error when APNS token fetch throws exception on iOS', async () => {
      setPlatformOS('ios')
      const mockError = new Error('APNS service unavailable')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockRejectedValue(mockError)

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: APNS token fetch failed: APNS service unavailable'
      )
    })

    it('throws error with combined FCM and APNS failures', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockRejectedValue(new Error('APNS error'))

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined); APNS token fetch failed: APNS error'
      )
    })

    it('handles non-Error exceptions (string messages)', async () => {
      setPlatformOS('ios')
      mockGetToken.mockRejectedValue('String error message')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed: String error message'
      )
    })
  })

  describe('with optional logger parameter', () => {
    it('works without logger provided', async () => {
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens()

      expect(result.success).toBe(true)
      expect(result.fcmDeviceToken).toBe('mock_fcm_token')
      expect(result.apnsToken).toBe('mock_apns_token')
    })

    it('handles null and undefined logger gracefully', async () => {
      // Test that the function works when logger is null/undefined
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      // Should work with null logger
      const resultWithNull = await getNotificationTokens(null as any)
      expect(resultWithNull.success).toBe(true)

      // Should work with undefined logger
      const resultWithUndefined = await getNotificationTokens(undefined)
      expect(resultWithUndefined.success).toBe(true)
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

      expect(result.success).toBe(true)
      expect(result.apnsToken).toBe(null)
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })
  })

  describe('edge cases with empty strings', () => {
    it('treats empty string FCM token as invalid', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'FCM token fetch failed (returned null/undefined)'
      )
    })

    it('treats empty string APNS token as invalid on iOS', async () => {
      setPlatformOS('ios')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'APNS token fetch failed (returned null/undefined on iOS)'
      )
    })
  })
})
