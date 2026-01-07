import { DeviceEventEmitter } from 'react-native'

import {
  dismissError,
  emitBifoldError,
  emitError,
  getErrorDefinition,
  trackErrorAction,
} from '../../src/errors/errorHandler'
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

// Mock @bifold/core before importing
jest.mock('@bifold/core', () => ({
  BifoldError: class BifoldError extends Error {
    title: string
    description: string
    code: number
    constructor(title: string, description: string, message: string, code: number) {
      super(message)
      this.title = title
      this.description = description
      this.code = code
    }
  },
  EventTypes: {
    ERROR_ADDED: 'ERROR_ADDED',
    ERROR_REMOVED: 'ERROR_REMOVED',
  },
}))

const { BifoldError, EventTypes } = jest.requireMock('@bifold/core')

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
  const mockT = jest.fn((key: string) => `translated:${key}`)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('emitError', () => {
    it('should emit a known error with translated title and description', () => {
      emitError('GENERAL_ERROR', mockT)

      expect(mockT).toHaveBeenCalledWith(ErrorRegistry.GENERAL_ERROR.titleKey)
      expect(mockT).toHaveBeenCalledWith(ErrorRegistry.GENERAL_ERROR.descriptionKey)
      expect(appLogger.error).toHaveBeenCalled()
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.any(BifoldError))
    })

    it('should not show modal when showModal option is false', () => {
      emitError('GENERAL_ERROR', mockT, { showModal: false })

      expect(DeviceEventEmitter.emit).not.toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.anything())
    })

    it('should fallback to GENERAL_ERROR for unknown error keys', () => {
      // Cast to any to test with an invalid key
      emitError('UNKNOWN_ERROR_KEY' as any, mockT)

      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error key'))
      // Should then emit GENERAL_ERROR
      expect(DeviceEventEmitter.emit).toHaveBeenCalled()
    })

    it('should extract error message from Error object', () => {
      const testError = new Error('Test error message')
      emitError('GENERAL_ERROR', mockT, { error: testError })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('GENERAL_ERROR'),
        expect.objectContaining({
          technicalMessage: 'Test error message',
        })
      )
    })

    it('should extract error message from string', () => {
      emitError('GENERAL_ERROR', mockT, { error: 'String error message' })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: 'String error message',
        })
      )
    })

    it('should extract error message from object with message property', () => {
      const errorObj = { message: 'Object error message' }
      emitError('GENERAL_ERROR', mockT, { error: errorObj })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: 'Object error message',
        })
      )
    })

    it('should JSON stringify unknown error types', () => {
      const errorObj = { code: 123, details: 'some details' }
      emitError('GENERAL_ERROR', mockT, { error: errorObj })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: JSON.stringify(errorObj),
        })
      )
    })

    it('should handle null error gracefully', () => {
      emitError('GENERAL_ERROR', mockT, { error: null })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: '',
        })
      )
    })

    it('should handle undefined error gracefully', () => {
      emitError('GENERAL_ERROR', mockT, { error: undefined })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: '',
        })
      )
    })

    it('should handle non-serializable errors', () => {
      // Create a circular reference that cannot be JSON.stringify'd
      const circular: Record<string, unknown> = {}
      circular.self = circular
      emitError('GENERAL_ERROR', mockT, { error: circular })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          technicalMessage: expect.stringContaining('Non-serializable'),
        })
      )
    })

    it('should include additional context in logs', () => {
      const context = { userId: '123', action: 'test' }
      emitError('GENERAL_ERROR', mockT, { context })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: '123',
          action: 'test',
        })
      )
    })

    it('should track error in analytics when showing modal', () => {
      emitError('CAMERA_BROKEN', mockT)

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(ErrorRegistry.CAMERA_BROKEN.code),
        message: ErrorRegistry.CAMERA_BROKEN.alertEvent,
      })
      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(ErrorRegistry.CAMERA_BROKEN.alertEvent)
    })

    it('should respect showModal from error definition when not explicitly set', () => {
      // If the error definition has showModal: false, it should not show modal
      // For this test, we use an error that defaults to showing modal
      emitError('CAMERA_BROKEN', mockT)

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.any(BifoldError))
    })
  })

  describe('emitBifoldError', () => {
    it('should emit a raw BifoldError', () => {
      const bifoldError = new BifoldError('Test Title', 'Test Description', 'Technical', 1234)

      emitBifoldError(bifoldError)

      expect(appLogger.error).toHaveBeenCalledWith(expect.stringContaining('BifoldError:1234'))
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_ADDED, bifoldError)
    })
  })

  describe('dismissError', () => {
    it('should emit ERROR_REMOVED event', () => {
      dismissError()

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_REMOVED)
    })
  })

  describe('trackErrorAction', () => {
    it('should track error action in analytics', () => {
      trackErrorAction('CAMERA_BROKEN', 'dismiss')

      expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith(ErrorRegistry.CAMERA_BROKEN.alertEvent, 'dismiss')
      expect(appLogger.debug).toHaveBeenCalledWith(expect.stringContaining(AlertInteractionEvent.ALERT_ACTION))
    })

    it('should use default action label if not provided', () => {
      trackErrorAction('CAMERA_BROKEN')

      expect(Analytics.trackAlertActionEvent).toHaveBeenCalledWith(ErrorRegistry.CAMERA_BROKEN.alertEvent, 'dismiss')
    })

    it('should log warning for unknown error keys', () => {
      trackErrorAction('UNKNOWN_ERROR_KEY' as any)

      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error key for tracking'))
      expect(Analytics.trackAlertActionEvent).not.toHaveBeenCalled()
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
      // Test various categories
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
})
