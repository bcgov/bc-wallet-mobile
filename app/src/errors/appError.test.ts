import { AppEventCode } from '@/events/appEventCode'
import { localization } from '@/localization'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { initLanguages } from '@bifold/core'
import { AppError, isAppError, isHandledAppError } from './appError'
import { ErrorCategory, ErrorDefinition, ErrorRegistry, ErrorSeverity } from './errorRegistry'

describe('AppError', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an AppError with correct properties', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const title = 'Test Error'
      const description = 'This is a test error'
      const message = 'Detailed technical message'
      const error = new AppError(title, description, identity, { cause: new Error(message) })

      expect(error.title).toBe(title)
      expect(error.description).toBe(description)
      expect(error.message).toBe(`${title}: ${description}`)
      expect(error.code).toBe('general.unknown_server_error.1234')
      expect(error.appEvent).toBe('unknown_server_error')
      expect(error.technicalMessage).toBe(message)
      expect(error.cause).toBeInstanceOf(Error)
      expect(error.timestamp).toBeDefined()
      expect(error.handled).toBe(false)
    })
  })

  describe('technicalMessage', () => {
    it('should return null if there is no cause', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      expect(error.technicalMessage).toBeNull()
    })

    it('should return null if cause is not an Error', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity, { cause: 'Not an error' as any })

      expect(error.technicalMessage).toBeNull()
    })
  })

  describe('track', () => {
    it('should track error event in analytics', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      error.track()

      expect(trackErrorEventSpy).toHaveBeenCalledWith(error)
    })
  })

  describe('fromErrorDefinition', () => {
    it('should create an AppError from an ErrorDefinition', () => {
      const definition: ErrorDefinition = {
        category: ErrorCategory.NETWORK,
        appEvent: AppEventCode.NO_INTERNET,
        statusCode: 2100,
        titleKey: 'titleKey',
        descriptionKey: 'descriptionKey',
        severity: ErrorSeverity.ERROR,
      }

      const error = AppError.fromErrorDefinition(definition, { cause: new Error('Network unreachable') })

      expect(error.title).toBe('titleKey')
      expect(error.description).toBe('descriptionKey')
      expect(error.code).toBe('network.no_internet.2100')
      expect(error.appEvent).toBe('no_internet')
      expect(error.technicalMessage).toBe('Network unreachable')
      expect(error.cause).toBeInstanceOf(Error)
    })

    it('should translate title and description keys if translations are available', () => {
      initLanguages(localization) // initialize i18next with localization

      const error = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR)

      expect(error.title).not.toBe('titleKey')
      expect(error.description).not.toBe('descriptionKey')
    })

    it('should track error event in analytics upon creation from definition by default', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const error = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR)

      expect(trackErrorEventSpy).toHaveBeenCalledWith(error)
    })

    it('should not track error event in analytics if specified false', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR, { track: false })

      expect(trackErrorEventSpy).not.toHaveBeenCalled()
    })

    it('should track error event in analytics if specified true', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const error = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR, { track: true })

      expect(trackErrorEventSpy).toHaveBeenCalledWith(error)
    })
  })

  describe('toBifoldError', () => {
    it('should convert AppError to BifoldError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity, { cause: new Error('Technical message') })
      const bifoldError = error.toBifoldError()

      expect(bifoldError.title).toBe('Title')
      expect(bifoldError.description).toBe('Description')
      expect(bifoldError.message).toBe('Technical message')
      expect(bifoldError.code).toBe(1234)
    })

    it('should use message if technicalMessage is null', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)
      const bifoldError = error.toBifoldError()

      expect(bifoldError.message).toBe('Title: Description')
    })
  })

  describe('toJSON', () => {
    it('should serialize AppError to JSON', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'))

      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const cause = new Error('Technical message')
      const error = new AppError('Title', 'Description', identity, { cause: cause })
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'AppError',
        message: 'Title: Description',
        technicalMessage: 'Technical message',
        code: 'general.unknown_server_error.1234',
        timestamp: '2024-01-01T00:00:00.000Z',
        cause: cause,
        handled: false,
      })

      jest.useRealTimers()
    })
  })

  describe('isHandledAppError', () => {
    it('should return true for handled AppError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)
      error.handled = true

      expect(isHandledAppError(error)).toBe(true)
    })

    it('should return false for unhandled AppError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      expect(isHandledAppError(error)).toBe(false)
    })

    it('should return false for non-AppError', () => {
      const error = new Error('Regular error')

      expect(isHandledAppError(error)).toBe(false)
    })
  })

  describe('isAppError', () => {
    it('should return true for AppError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      expect(isAppError(error)).toBe(true)
    })

    it('should return true for AppError with matching appEvent code', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      expect(isAppError(error, AppEventCode.UNKNOWN_SERVER_ERROR)).toBe(true)
    })

    it('should return false for AppError with non-matching appEvent code', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Title', 'Description', identity)

      expect(isAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)).toBe(false)
    })
  })
})
