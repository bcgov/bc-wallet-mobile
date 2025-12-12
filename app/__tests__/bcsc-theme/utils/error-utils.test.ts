import { formatIasAxiosResponseError, is404Error } from '@/bcsc-theme/utils/error-utils'
import { AxiosError } from 'axios'

describe('Error Utils', () => {
  describe('formatIasAxiosResponseError', () => {
    it('should return Network Error when error has no response', () => {
      const mockError = {
        name: 'TestError',
      }

      const formattedError = formatIasAxiosResponseError(mockError as AxiosError<any>)

      expect(formattedError.code).toBe('NETWORK_ERROR')
      expect(formattedError.message).toContain('network error')
      expect(formattedError.name).toBe('TestError')
    })

    it('should return formatted IAS error when response contains error and error_description', () => {
      const mockError = {
        name: 'TestError',
        response: {
          data: {
            error: 'invalid_request',
            error_description: 'The request is missing a required parameter.',
          },
        },
      }

      const formattedError = formatIasAxiosResponseError(mockError as AxiosError<any>)

      expect(formattedError.code).toBe('IAS_INVALID_REQUEST')
      expect(formattedError.message).toBe('The request is missing a required parameter.')
      expect(formattedError.name).toBe('IASAxiosError')
    })

    it('should return Service Unavailable error for 503 status code', () => {
      const mockError = {
        name: 'TestError',
        response: {
          status: 503,
          data: {},
          headers: {},
        },
      }

      const formattedError = formatIasAxiosResponseError(mockError as AxiosError<any>)

      expect(formattedError.code).toBe('IAS_SERVICE_UNAVAILABLE')
      expect(formattedError.message).toContain('currently unavailable')
      expect(formattedError.name).toBe('IASAxiosError')
    })

    it('should add retry information if provided in headers for 503 status code (120s)', () => {
      const mockError = {
        name: 'TestError',
        response: {
          status: 503,
          data: {},
          headers: {
            'retry-after': '120',
          },
        },
      }

      const formattedError = formatIasAxiosResponseError(mockError as any)

      expect(formattedError.code).toBe('IAS_SERVICE_UNAVAILABLE')
      expect(formattedError.message).toContain('currently unavailable')
      expect(formattedError.message).toContain('after 2 minutes')
      expect(formattedError.name).toBe('IASAxiosError')
    })

    it('should add retry information if provided in headers for 503 status code (60s)', () => {
      const mockError = {
        name: 'TestError',
        response: {
          status: 503,
          data: {},
          headers: {
            'retry-after': '60',
          },
        },
      }

      const formattedError = formatIasAxiosResponseError(mockError as any)

      expect(formattedError.code).toBe('IAS_SERVICE_UNAVAILABLE')
      expect(formattedError.message).toContain('currently unavailable')
      expect(formattedError.message).toContain('after 1 minute')
      expect(formattedError.name).toBe('IASAxiosError')
    })

    it('should add retry information if provided in headers for 503 status code (61s)', () => {
      const mockError = {
        name: 'TestError',
        response: {
          status: 503,
          data: {},
          headers: {
            'retry-after': '61',
          },
        },
      }

      const formattedError = formatIasAxiosResponseError(mockError as any)

      expect(formattedError.code).toBe('IAS_SERVICE_UNAVAILABLE')
      expect(formattedError.message).toContain('currently unavailable')
      expect(formattedError.message).toContain('after 2 minutes')
      expect(formattedError.name).toBe('IASAxiosError')
    })
  })

  describe('is404Error', () => {
    it('should return true for an error with 404 status', () => {
      const mockError = {
        response: {
          status: 404,
        },
      }

      expect(is404Error(mockError)).toBe(true)
    })

    it('should return false for an error with non-404 status', () => {
      const mockError = {
        response: {
          status: 400,
        },
      }

      expect(is404Error(mockError)).toBe(false)
    })

    it('should return false for an error without response', () => {
      const mockError = {
        name: 'NetworkError',
      }

      expect(is404Error(mockError)).toBe(false)
    })

    it('should return false for an error with null response', () => {
      const mockError = {
        response: null,
      }

      expect(is404Error(mockError)).toBe(false)
    })

    it('should return false for an error with undefined response', () => {
      const mockError = {
        response: undefined,
      }

      expect(is404Error(mockError)).toBe(false)
    })

    it('should return false for null error', () => {
      expect(is404Error(null)).toBe(false)
    })

    it('should return false for undefined error', () => {
      expect(is404Error(undefined)).toBe(false)
    })

    it('should return false for non-object error', () => {
      expect(is404Error('error string')).toBe(false)
      expect(is404Error(123)).toBe(false)
    })

    it('should handle AxiosError with 404 status', () => {
      const mockError: Partial<AxiosError> = {
        name: 'AxiosError',
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
      }

      expect(is404Error(mockError)).toBe(true)
    })
  })
})
