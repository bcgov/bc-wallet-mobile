import { Platform } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import { getNotificationTokens, NotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'

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

// Create a mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

describe('getNotificationTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset Platform.OS to iOS for most tests
    ;(Platform as any).OS = 'ios'
  })

  describe('Success Cases', () => {
    it('should return tokens successfully on iOS with both FCM and APNS tokens', async () => {
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

    it('should return tokens successfully on Android with only FCM token', async () => {
      ;(Platform as any).OS = 'android'
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

  describe('Failure Cases', () => {
    it('should throw error when FCM token is null', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
    })

    it('should throw error when FCM token is undefined', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue(undefined)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined)'
      )
    })

    it('should throw error when FCM token fetch throws exception', async () => {
      ;(Platform as any).OS = 'ios'
      const mockError = new Error('FCM service unavailable')
      mockGetToken.mockRejectedValue(mockError)
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed: FCM service unavailable'
      )
    })

    it('should throw error on iOS when APNS token is null', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue(null)

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: APNS token fetch failed (returned null/undefined on iOS)'
      )
    })

    it('should throw error on iOS when APNS token fetch throws exception', async () => {
      ;(Platform as any).OS = 'ios'
      const mockError = new Error('APNS service unavailable')
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockRejectedValue(mockError)

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: APNS token fetch failed: APNS service unavailable'
      )
    })

    it('should throw error with multiple failures', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue(null)
      mockGetAPNSToken.mockRejectedValue(new Error('APNS error'))

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed (returned null/undefined); APNS token fetch failed: APNS error'
      )
    })

    it('should handle non-Error exceptions properly', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockRejectedValue('String error message')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'Failed to retrieve required tokens. Errors: FCM token fetch failed: String error message'
      )
    })
  })

  describe('Logger Integration', () => {
    it('should work without logger (optional parameter)', async () => {
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      const result = await getNotificationTokens()

      expect(result.success).toBe(true)
      expect(result.fcmDeviceToken).toBe('mock_fcm_token')
      expect(result.apnsToken).toBe('mock_apns_token')
    })

    it('should handle logger gracefully when it fails', async () => {
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

  describe('Platform-Specific Behavior', () => {
    it('should not call getAPNSToken on Android', async () => {
      ;(Platform as any).OS = 'android'
      mockGetToken.mockResolvedValue('mock_fcm_token')

      await getNotificationTokens(mockLogger)

      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })

    it('should call getAPNSToken on iOS', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await getNotificationTokens(mockLogger)

      expect(mockGetAPNSToken).toHaveBeenCalled()
    })

    it('should handle unknown platform as non-iOS', async () => {
      ;(Platform as any).OS = 'web'
      mockGetToken.mockResolvedValue('mock_fcm_token')

      const result = await getNotificationTokens(mockLogger)

      expect(result.success).toBe(true)
      expect(result.apnsToken).toBe(null)
      expect(mockGetAPNSToken).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string FCM token as invalid', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue('')
      mockGetAPNSToken.mockResolvedValue('mock_apns_token')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'FCM token fetch failed (returned null/undefined)'
      )
    })

    it('should handle empty string APNS token as invalid on iOS', async () => {
      ;(Platform as any).OS = 'ios'
      mockGetToken.mockResolvedValue('mock_fcm_token')
      mockGetAPNSToken.mockResolvedValue('')

      await expect(getNotificationTokens(mockLogger)).rejects.toThrow(
        'APNS token fetch failed (returned null/undefined on iOS)'
      )
    })
  })
})
