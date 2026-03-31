import { UNKNOWN_APP_ERROR_STATUS_CODE } from '@/constants'
import { AppEventCode } from '@/events/appEventCode'
import { BifoldError } from '@bifold/core'
import { AppError } from './appError'
import {
  extractErrorMessage,
  getErrorDefinition,
  getErrorDefinitionFromAppEventCode,
  toBifoldError,
} from './errorHandler'
import { ErrorCategory, ErrorRegistry, ErrorSeverity } from './errorRegistry'

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

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => (key === 'Error.ReportThisProblem' ? 'Report this problem' : key)),
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

  describe('getErrorDefinition', () => {
    it('should return the error definition for a valid key', () => {
      const definition = getErrorDefinition('CAMERA_BROKEN')

      expect(definition).toEqual(ErrorRegistry.CAMERA_BROKEN)
      expect(definition.statusCode).toBe(2000)
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

  describe('getErrorDefinitionFromAppEventCode', () => {
    it('should return correct error definition for known app event code', () => {
      const definition = getErrorDefinitionFromAppEventCode('general')

      expect(definition).toEqual(ErrorRegistry.GENERAL_ERROR)
    })

    it('should return null for unknown app event code', () => {
      const definition = getErrorDefinitionFromAppEventCode('unknown_event_code')

      expect(definition).toBeNull()
    })

    it('sanity test for all error definitions', () => {
      Object.values(ErrorRegistry).forEach((definition) => {
        const fetchedDef = getErrorDefinitionFromAppEventCode(definition.appEvent)
        expect(fetchedDef).toEqual(definition)
      })
    })

    it('shoulf return null for empty app event code', () => {
      const definition = getErrorDefinitionFromAppEventCode('')

      expect(definition).toBeNull()
    })
  })

  describe('toBifoldError', () => {
    it('should convert a plain Error into a BifoldError with UNKNOWN_APP_ERROR_STATUS_CODE', () => {
      const error = new Error('something broke')
      error.stack = 'fake stack'

      const result = toBifoldError('Title', 'Description', error)

      expect(result).toBeInstanceOf(BifoldError)
      expect(result.title).toBe('Title')
      expect(result.description).toBe('Description')
      expect(result.message).toBe('something broke')
      expect(result.code).toBe(UNKNOWN_APP_ERROR_STATUS_CODE)
      expect(result.stack).toBe('fake stack')
    })

    it('should convert an AppError into a BifoldError with its statusCode and fullMessage', () => {
      const cause = new Error('technical details')
      const appError = new AppError(
        'App Error',
        {
          category: ErrorCategory.GENERAL,
          appEvent: AppEventCode.GENERAL,
          statusCode: 1000,
        },
        { cause, track: false }
      )

      const result = toBifoldError('Display Title', 'Display Description', appError)

      expect(result).toBeInstanceOf(BifoldError)
      expect(result.message).toBe(appError.fullMessage)
      expect(result.title).toBe('Display Title')
      expect(result.description).toBe('Display Description')
      expect(result.code).toBe(1000)
      expect(result.cause).toBe(cause)
    })

    it('should preserve the cause from the original error', () => {
      const cause = new Error('root cause')
      const error = new Error('wrapper')
      error.cause = cause

      const result = toBifoldError('T', 'D', error)

      expect(result.cause).toBe(cause)
    })
  })
})
