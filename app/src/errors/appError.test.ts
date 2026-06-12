import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { AppError, isAppError, isHandledAppError } from './appError'
import { ErrorCategory, ErrorRegistry, ErrorSeverity } from './errorRegistry'

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

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
      const message = 'Detailed technical message'
      const error = new AppError(message, identity, { cause: new Error(message) })

      expect(error.message).toBe(message)
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
      const error = new AppError('Something went wrong', identity)

      expect(error.technicalMessage).toBeNull()
    })

    it('should return null if cause is not an Error', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Something went wrong', identity, { cause: 'Not an error' as any })

      expect(error.technicalMessage).toBeNull()
    })

    it('should prefix the native error code when present on the cause', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const cause = Object.assign(new Error("Key pair with alias 'abc' not found."), { code: 'E_KEY_NOT_FOUND' })
      const error = new AppError('Something went wrong', identity, { cause })

      expect(error.technicalMessage).toBe("E_KEY_NOT_FOUND: Key pair with alias 'abc' not found.")
    })
  })

  describe('fullMessage', () => {
    it('should return message without technicalMessage', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Something went wrong', identity)

      expect(error.fullMessage).toBe('Something went wrong\nDebug: [general.unknown_server_error.1234]')
    })

    it('should return message with technicalMessage if cause is present', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const technicalMessage = 'Technical details about the error'
      const error = new AppError('Something went wrong', identity, { cause: new Error(technicalMessage) })

      expect(error.fullMessage).toBe(
        'Something went wrong\nDebug: [general.unknown_server_error.1234] Technical details about the error'
      )
    })

    it('should append URL if set', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Something went wrong', identity)
      error.url = 'https://example.com/device/token'

      expect(error.fullMessage).toBe(
        'Something went wrong\nDebug: [general.unknown_server_error.1234]\nRequest: https://example.com/device/token'
      )
    })

    it('should include HTTP method with URL when both are set', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Something went wrong', identity)
      error.url = 'https://example.com/device/token'
      error.method = 'POST'

      expect(error.fullMessage).toBe(
        'Something went wrong\nDebug: [general.unknown_server_error.1234]\nRequest: POST https://example.com/device/token'
      )
    })

    it('should append screen name when screen is set', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Something went wrong', identity)
      error.screen = 'HomeScreen'

      expect(error.fullMessage).toBe(
        'Something went wrong\nDebug: [general.unknown_server_error.1234]\nScreen: HomeScreen'
      )
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
      const error = new AppError('Something went wrong', identity)

      error.track()

      expect(trackErrorEventSpy).toHaveBeenCalledWith({
        code: AppEventCode.UNKNOWN_SERVER_ERROR,
        message: `[${error.code}] ${error.message}`,
      })
    })

    it('should include the HTTP status and endpoint in the tracked message when present', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const identity = {
        category: ErrorCategory.NETWORK,
        appEvent: AppEventCode.NOT_FOUND,
        statusCode: 2113,
      }
      // track: false so the constructor's auto-track doesn't fire before url/method are set
      const error = new AppError('Not found', identity, { cause: { response: { status: 404 } }, track: false })
      error.url = '/device/userinfo'
      error.method = 'GET'

      error.track()

      expect(trackErrorEventSpy).toHaveBeenCalledWith({
        code: AppEventCode.NOT_FOUND,
        message: `[${error.code}] HTTP 404 GET /device/userinfo Not found`,
      })
    })
  })

  describe('fromErrorDefinition', () => {
    it('should create an AppError from an ErrorDefinition', () => {
      const definition = {
        category: ErrorCategory.NETWORK,
        appEvent: AppEventCode.NO_INTERNET,
        statusCode: 2100,
        severity: ErrorSeverity.ERROR,
        message: 'No internet connection',
      }

      const error = AppError.fromErrorDefinition(definition, { cause: new Error('Network unreachable') })

      expect(error.message).toBe('No internet connection')
      expect(error.code).toBe('network.no_internet.2100')
      expect(error.appEvent).toBe('no_internet')
      expect(error.technicalMessage).toBe('Network unreachable')
      expect(error.cause).toBeInstanceOf(Error)
    })

    it('should track error event in analytics upon creation from definition by default', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const error = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR)

      expect(trackErrorEventSpy).toHaveBeenCalledWith({
        code: AppEventCode.GENERAL,
        message: `[${error.code}] ${error.message}`,
      })
    })

    it('should not track error event in analytics if specified false', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR, { track: false })

      expect(trackErrorEventSpy).not.toHaveBeenCalled()
    })

    it('should track error event in analytics if specified true', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')

      const error = AppError.fromErrorDefinition(ErrorRegistry.GENERAL_ERROR, { track: true })

      expect(trackErrorEventSpy).toHaveBeenCalledWith({
        code: AppEventCode.GENERAL,
        message: `[${error.code}] ${error.message}`,
      })
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
      const error = new AppError('Something went wrong', identity, { cause })
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'AppError',
        message: 'Something went wrong',
        technicalMessage: 'Technical message',
        code: 'general.unknown_server_error.1234',
        timestamp: '2024-01-01T00:00:00.000Z',
        // cause is summarized (not the raw Error) so large nested bodies never serialize
        cause: { name: 'Error', message: 'Technical message' },
        handled: false,
        url: undefined,
        method: undefined,
      })

      jest.useRealTimers()
    })

    it('summarizes the cause so a large request body is never serialized', () => {
      const identity = {
        category: ErrorCategory.NETWORK,
        appEvent: AppEventCode.NO_INTERNET,
        statusCode: 2100,
      }
      // Mimic an AxiosError carrying a multi-MB evidence-upload body on config.data.
      const axiosLike = Object.assign(new Error('Network Error'), {
        code: 'ERR_NETWORK',
        config: { data: Buffer.alloc(1_000_000) },
      })
      const error = new AppError('Upload failed', identity, { cause: axiosLike, track: false })

      const json = error.toJSON()

      expect(json.cause).toEqual({ name: 'Error', message: 'Network Error', code: 'ERR_NETWORK' })
      // The 1 MB Buffer must not survive serialization (would be ~MBs as a JSON number array).
      expect(JSON.stringify(json).length).toBeLessThan(2000)
    })
  })

  describe('isHandledAppError', () => {
    it('should return true for handled AppError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Error', identity)
      error.handled = true

      expect(isHandledAppError(error)).toBe(true)
    })

    it('should return false for unhandled AppError', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Error', identity)

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
      const error = new AppError('Error', identity)

      expect(isAppError(error)).toBe(true)
    })

    it('should return true for AppError with matching appEvent code', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Error', identity)

      expect(isAppError(error, AppEventCode.UNKNOWN_SERVER_ERROR)).toBe(true)
    })

    it('should return false for AppError with non-matching appEvent code', () => {
      const identity = {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
        statusCode: 1234,
      }
      const error = new AppError('Error', identity)

      expect(isAppError(error, AppEventCode.ADD_CARD_CAMERA_BROKEN)).toBe(false)
    })
  })
})
