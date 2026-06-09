import { ErrorRegistry } from '@/errors/errorRegistry'
import { formatIasAxiosResponseError, getAppErrorFromAxiosError, getAxiosErrorDefinition } from './axios-error-utils'

describe('Error Utils', () => {
  describe('getAppErrorFromAxiosError', () => {
    /**
     * IAS error codes 201–300: when the backend returns response.data.error = code,
     * getAppErrorFromAxiosError should produce an AppError with the matching ErrorRegistry definition.
     */
    const IAS_ERROR_CODES = [
      'add_card_server_configuration',
      'add_card_dynamic_registration',
      'add_card_terms_of_use',
      'add_card_incorrect_os',
      'add_card_provider',
      'err_206_missing_or_null_values_in_json_response',
      'err_207_unable_to_sign_claims_set',
      'err_208_unexpected_network_call_exception',
      'err_209_bad_request',
      'err_210_unauthorized',
      'err_211_server_outage',
      'err_212_retry_later',
      'err_213_failed_creating_client_registration',
      'err_299_keys_out_of_sync',
      'err_300_empty_response',
    ] as const

    it.each(IAS_ERROR_CODES)('should map IAS code "%s" to AppError with correct appEvent and statusCode', (code) => {
      const axiosError = {
        code,
        message: 'IAS error description',
        config: {},
        response: { data: { error: code, error_description: 'desc' }, status: 400 },
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.appEvent).toBe(code)
      const definition = Object.values(ErrorRegistry).find((d) => d.appEvent === code)
      expect(definition).toBeDefined()
      expect(appError.code).toContain(String(definition!.statusCode))
    })

    it('should map unknown error code to UNKNOWN_SERVER_ERROR', () => {
      const axiosError = {
        code: 'unknown_ias_code',
        message: 'Unknown',
        config: {},
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.appEvent).toBe('unknown_server_error')
      expect(appError.code).toContain(String(ErrorRegistry.UNKNOWN_SERVER_ERROR.statusCode))
    })

    it('should set url path and method from error config', () => {
      const axiosError = {
        code: 'err_209_bad_request',
        message: 'Bad request',
        config: { url: 'https://example.com/device/token', method: 'post' },
        response: { data: {}, status: 400 },
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.url).toBe('/device/token')
      expect(appError.method).toBe('POST')
    })

    it('should set url path to undefined when config.url is absent', () => {
      const axiosError = {
        code: 'unknown_ias_code',
        message: 'Unknown',
        config: {},
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.url).toBeUndefined()
    })
  })

  describe('formatIasAxiosResponseError', () => {
    it('should update the error code and message if response data contains error and error_description', () => {
      const axiosError = {
        response: {
          data: {
            error: 'C',
            error_description: 'D',
          },
        },
        code: 'A',
        message: 'B',
      } as any

      const formattedError = formatIasAxiosResponseError(axiosError)

      expect(formattedError.code).toBe('C')
      expect(formattedError.message).toBe('D')
    })

    it('should not update the error code and message if response data does not contain error and error_description', () => {
      const axiosError = {
        response: {
          data: {
            some_other_field: 'C',
          },
        },
        code: 'A',
        message: 'B',
      } as any

      const formattedError = formatIasAxiosResponseError(axiosError)

      expect(formattedError.code).toBe('A')
      expect(formattedError.message).toBe('B')
    })
  })

  describe('getAxiosErrorDefinition', () => {
    it('NETWORK_ERROR should resolve to NO_INTERNET AppError', () => {
      const appError = getAxiosErrorDefinition('ERR_NETWORK')

      expect(appError).toBeDefined()
      expect(appError?.appEvent).toBe('no_internet')
    })

    it('ECONNABORTED should resolve to SERVER_TIMEOUT AppError', () => {
      const errorDefinition = getAxiosErrorDefinition('ECONNABORTED')

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe('server_timeout')
    })

    it('BAD_REQUEST without a status should resolve to BAD_REQUEST AppError', () => {
      const errorDefinition = getAxiosErrorDefinition('ERR_BAD_REQUEST')

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe('err_209_bad_request')
    })

    // Axios collapses every 4xx into ERR_BAD_REQUEST; we disambiguate by the real HTTP status so
    // 401/403/404/429 no longer masquerade as the "HTTP 400 / error 209" bad-request error.
    it.each([
      [400, 'err_209_bad_request'],
      [401, 'err_210_unauthorized'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [429, 'err_212_retry_later'],
      [409, 'err_209_bad_request'], // unmapped 4xx falls back to BAD_REQUEST
    ])('BAD_REQUEST with status %s should resolve to appEvent "%s"', (status, expectedAppEvent) => {
      const errorDefinition = getAxiosErrorDefinition('ERR_BAD_REQUEST', status)

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe(expectedAppEvent)
    })

    it('BAD_RESPONSE should resolve to SERVER_ERROR AppError', () => {
      const errorDefinition = getAxiosErrorDefinition('ERR_BAD_RESPONSE')

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe('server_error')
    })
  })
})
