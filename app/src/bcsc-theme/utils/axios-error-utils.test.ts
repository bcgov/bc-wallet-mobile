import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import {
  formatIasAxiosResponseError,
  getAppErrorFromAxiosError,
  getAxiosErrorDefinition,
  getRedactedNetworkDiagnostics,
  safeHost,
} from './axios-error-utils'

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

    it('BAD_REQUEST should resolve to BAD_REQUEST AppError', () => {
      const errorDefinition = getAxiosErrorDefinition('ERR_BAD_REQUEST')

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe('err_209_bad_request')
    })

    it('BAD_RESPONSE should resolve to SERVER_ERROR AppError', () => {
      const errorDefinition = getAxiosErrorDefinition('ERR_BAD_RESPONSE')

      expect(errorDefinition).toBeDefined()
      expect(errorDefinition?.appEvent).toBe('server_error')
    })
  })

  describe('safeHost', () => {
    it('returns only the host, dropping path and the signed-URL query string', () => {
      expect(safeHost('https://store.blob.core.windows.net/container/file.jpg?sig=SECRETSIG&se=2026')).toBe(
        'store.blob.core.windows.net'
      )
    })

    it('returns undefined for missing input', () => {
      expect(safeHost(undefined)).toBeUndefined()
      expect(safeHost('')).toBeUndefined()
    })

    it('returns undefined for an unparseable url', () => {
      expect(safeHost('not a url')).toBeUndefined()
    })
  })

  describe('getRedactedNetworkDiagnostics', () => {
    it('unwraps an AppError cause and extracts transport detail without leaking tokens', () => {
      const signedUrl = 'https://store.blob.core.windows.net/c/video.mp4?sig=TOPSECRET&token=abc'
      const axiosError = {
        code: 'ERR_NETWORK',
        config: {
          method: 'put',
          url: signedUrl,
          headers: { Authorization: 'Bearer JWT.TOKEN.SECRET' },
        },
      } as any
      const appError = AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { cause: axiosError, track: false })

      const diagnostics = getRedactedNetworkDiagnostics(appError)

      expect(diagnostics).toEqual({
        axiosCode: 'ERR_NETWORK',
        httpStatus: undefined,
        method: 'PUT',
        host: 'store.blob.core.windows.net',
      })
      // Redaction guarantee: no signed-URL token or auth header survives serialization.
      const serialized = JSON.stringify(diagnostics)
      expect(serialized).not.toContain('TOPSECRET')
      expect(serialized).not.toContain('Bearer')
      expect(serialized).not.toContain('Authorization')
    })

    it('reads the HTTP status from a response-bearing axios error', () => {
      const axiosError = {
        code: 'ERR_BAD_RESPONSE',
        config: { method: 'put', url: 'https://api.example.com/evidence/v1/photos' },
        response: { status: 413 },
      } as any

      expect(getRedactedNetworkDiagnostics(axiosError)).toEqual({
        axiosCode: 'ERR_BAD_RESPONSE',
        httpStatus: 413,
        method: 'PUT',
        host: 'api.example.com',
      })
    })

    it('returns an empty object for a non-network error', () => {
      expect(getRedactedNetworkDiagnostics(new Error('Cache missing video data'))).toEqual({})
      expect(getRedactedNetworkDiagnostics(undefined)).toEqual({})
    })
  })
})
