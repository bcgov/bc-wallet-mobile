import { extractErrorMessage, getErrorDefinition, logError, trackErrorInAnalytics } from '../../src/errors/errorHandler'
import { ErrorCategory, ErrorRegistry, ErrorSeverity } from '../../src/errors/errorRegistry'
import { AlertInteractionEvent } from '../../src/events/alertEvents'
import { Analytics } from '../../src/utils/analytics/analytics-singleton'
import { appLogger } from '../../src/utils/logger'

// Mock dependencies
jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios ?? obj.default),
  },
}))

jest.mock('../../src/utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackErrorEvent: jest.fn(),
    trackAlertDisplayEvent: jest.fn(),
    trackAlertActionEvent: jest.fn(),
  },
}))

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractErrorMessage', () => {
    it('should return empty string for null', () => {
      expect(extractErrorMessage(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(extractErrorMessage(undefined)).toBe('')
    })

    it('should extract message from Error object', () => {
      const error = new Error('Test error message')
      expect(extractErrorMessage(error)).toBe('Test error message')
    })

    it('should return string directly', () => {
      expect(extractErrorMessage('Direct string error')).toBe('Direct string error')
    })

    it('should extract message from object with message property', () => {
      const errorObj = { message: 'Object error message' }
      expect(extractErrorMessage(errorObj)).toBe('Object error message')
    })

    it('should stringify other objects', () => {
      const obj = { code: 123, details: 'some details' }
      expect(extractErrorMessage(obj)).toBe(JSON.stringify(obj))
    })

    it('should handle circular references gracefully', () => {
      const circular: Record<string, unknown> = { name: 'test' }
      circular.self = circular
      expect(extractErrorMessage(circular)).toBe('[Non-serializable object]')
    })
  })

  describe('trackErrorInAnalytics', () => {
    it('should track error event in analytics', () => {
      const definition = ErrorRegistry.CAMERA_BROKEN

      trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(definition.code),
        message: definition.alertEvent,
      })
    })

    it('should track alert display event', () => {
      const definition = ErrorRegistry.NO_INTERNET

      trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)

      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(definition.alertEvent)
    })

    it('should not track alert display for non-display events', () => {
      const definition = ErrorRegistry.SERVER_ERROR

      trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_ACTION)

      expect(Analytics.trackErrorEvent).toHaveBeenCalled()
      expect(Analytics.trackAlertDisplayEvent).not.toHaveBeenCalled()
    })

    it('should log debug information', () => {
      const definition = ErrorRegistry.GENERAL_ERROR

      trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)

      expect(appLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(AlertInteractionEvent.ALERT_DISPLAY),
        expect.objectContaining({
          code: definition.code,
          category: definition.category,
          severity: definition.severity,
        })
      )
    })
  })

  describe('getErrorDefinition', () => {
    it('should return the error definition for a valid key', () => {
      const definition = getErrorDefinition('CAMERA_BROKEN')

      expect(definition).toEqual(ErrorRegistry.CAMERA_BROKEN)
      expect(definition.code).toBe(2000)
      expect(definition.category).toBe(ErrorCategory.CAMERA)
      expect(definition.severity).toBe(ErrorSeverity.ERROR)
    })

    it('should return error definitions for all error categories', () => {
      expect(getErrorDefinition('NO_INTERNET').category).toBe(ErrorCategory.NETWORK)
      expect(getErrorDefinition('LOGIN_PARSE_URI').category).toBe(ErrorCategory.AUTHENTICATION)
      expect(getErrorDefinition('CARD_EXPIRED_WILL_REMOVE').category).toBe(ErrorCategory.CREDENTIAL)
      expect(getErrorDefinition('VERIFY_NOT_COMPLETE').category).toBe(ErrorCategory.VERIFICATION)
      expect(getErrorDefinition('INVALID_TOKEN').category).toBe(ErrorCategory.TOKEN)
      expect(getErrorDefinition('STORAGE_WRITE_ERROR').category).toBe(ErrorCategory.STORAGE)
      expect(getErrorDefinition('ANDROID_APP_UPDATE_REQUIRED').category).toBe(ErrorCategory.DEVICE)
      expect(getErrorDefinition('GENERAL_ERROR').category).toBe(ErrorCategory.GENERAL)
      expect(getErrorDefinition('STATE_LOAD_ERROR').category).toBe(ErrorCategory.WALLET)
      expect(getErrorDefinition('PARSE_INVITATION_ERROR').category).toBe(ErrorCategory.CONNECTION)
    })
  })

  describe('logError', () => {
    it('should log error with all details', () => {
      const definition = ErrorRegistry.NO_INTERNET
      const technicalMessage = 'Network request failed'

      logError('NO_INTERNET', definition, technicalMessage)

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('NO_INTERNET'),
        expect.objectContaining({
          code: definition.code,
          category: definition.category,
          severity: definition.severity,
          technicalMessage,
        })
      )
    })

    it('should include additional context in logs', () => {
      const definition = ErrorRegistry.GENERAL_ERROR
      const context = { userId: '123', screen: 'Home' }

      logError('GENERAL_ERROR', definition, 'Some error', context)

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: '123',
          screen: 'Home',
        })
      )
    })

    it('should handle empty technical message', () => {
      const definition = ErrorRegistry.CAMERA_BROKEN

      logError('CAMERA_BROKEN', definition, '')

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: '',
        })
      )
    })
  })
})
