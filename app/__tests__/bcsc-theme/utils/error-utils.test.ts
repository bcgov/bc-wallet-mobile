import { formatIasAxiosResponseError } from '@/bcsc-theme/utils/error-utils'
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
})
