import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { AxiosError } from 'axios'
import {
  formatAxiosErrorForLogger,
  formatIasAxiosResponseError,
  formatNetworkAxiosError,
  getAppErrorFromAxiosError,
  getAxiosErrorDefinition,
  isNetworkError,
} from './axios-error-utils'

// What React Native leaves on the XMLHttpRequest axios attaches to a failed request
const xhrWith = (responseText: string) => ({ responseType: '', responseText })

const TLS_NATIVE_TEXT =
  'Hostname id.example.com not verified:\n    certificate: sha256/abc=\n    subjectAltNames: [other.example.com]'

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

    it('should add url path and method to the error context from error config', () => {
      const axiosError = {
        code: 'err_209_bad_request',
        message: 'Bad request',
        config: { url: 'https://example.com/device/token', method: 'post' },
        response: { data: {}, status: 400 },
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.context).toEqual({
        http_url: '/device/token',
        http_route: '/device/token',
        http_method: 'POST',
        http_status: 400,
        http_response_size: 2,
        http_request_size: 0,
      })
    })

    it('should format the route', () => {
      const axiosError = {
        code: 'err_209_bad_request',
        message: 'Bad request',
        config: { url: 'https://example.com/device/token', method: 'post' },
        response: { data: {}, status: 400 },
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.context).toEqual({
        http_url: '/device/token',
        http_route: '/device/token',
        http_method: 'POST',
        http_status: 400,
        http_response_size: 2,
        http_request_size: 0,
      })
    })

    it('should leave the context url undefined when config.url is absent', () => {
      const axiosError = {
        code: 'unknown_ias_code',
        message: 'Unknown',
        config: {},
      } as any

      const appError = getAppErrorFromAxiosError(axiosError)

      expect(appError.context).toEqual({
        http_url: undefined,
        http_route: undefined,
        http_method: undefined,
        http_status: undefined,
        http_response_size: 0,
        http_request_size: 0,
      })
    })

    // A status pre-declared via suppressStatusCodeLogs is treated as "expected"/already-owned-
    // elsewhere (e.g. a caller that retries internally and reports its own summary, like
    // BCSCApiClient.fetchJwk) — analytics tracking is skipped for it too, not just the response
    // interceptor's own log line, so retries don't inflate dashboards once per attempt.
    describe('analytics tracking suppression via suppressStatusCodeLogs', () => {
      beforeEach(() => {
        jest.restoreAllMocks()
      })

      it('should skip analytics tracking when the response status is pre-declared', () => {
        const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')
        const axiosError = {
          code: 'ERR_BAD_RESPONSE',
          message: 'Service Unavailable',
          config: { suppressStatusCodeLogs: [503] },
          response: { data: {}, status: 503 },
        } as any

        getAppErrorFromAxiosError(axiosError)

        expect(trackErrorEventSpy).not.toHaveBeenCalled()
      })

      it('should skip analytics tracking for a network error (status 0) when 0 is pre-declared', () => {
        const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')
        const axiosError = {
          code: 'ERR_NETWORK',
          message: 'Network Error',
          config: { suppressStatusCodeLogs: [0] },
        } as any

        getAppErrorFromAxiosError(axiosError)

        expect(trackErrorEventSpy).not.toHaveBeenCalled()
      })

      it('should track analytics normally when the status is not pre-declared', () => {
        const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')
        const axiosError = {
          code: 'ERR_BAD_RESPONSE',
          message: 'Service Unavailable',
          config: { suppressStatusCodeLogs: [404] },
          response: { data: {}, status: 503 },
        } as any

        getAppErrorFromAxiosError(axiosError)

        expect(trackErrorEventSpy).toHaveBeenCalled()
      })

      it('should track analytics normally when suppressStatusCodeLogs is not set', () => {
        const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent')
        const axiosError = {
          code: 'ERR_BAD_RESPONSE',
          message: 'Service Unavailable',
          config: {},
          response: { data: {}, status: 503 },
        } as any

        getAppErrorFromAxiosError(axiosError)

        expect(trackErrorEventSpy).toHaveBeenCalled()
      })
    })

    describe('network errors (no response)', () => {
      it('maps a rejected certificate to UNSECURED_NETWORK and keeps the host out of what it carries', () => {
        const error = new AxiosError(
          'Network Error',
          'ERR_NETWORK',
          { url: 'https://id.example.com/cardtap/v3/terms', method: 'get' } as any,
          xhrWith(TLS_NATIVE_TEXT)
        )

        const appError = getAppErrorFromAxiosError(formatNetworkAxiosError(error))

        expect(appError.appEvent).toBe(AppEventCode.UNSECURED_NETWORK)
        expect(appError.statusCode).toBe(ErrorRegistry.UNSECURED_NETWORK.statusCode)
        expect(appError.context).toMatchObject({ http_url: '/cardtap/v3/terms' })
        expect(appError.technicalMessage).toBe('Network Error: Hostname <host> not verified:')
        expect(JSON.stringify(appError.toJSON())).not.toContain('example.com')
      })

      it('keeps NO_INTERNET for a failure with no native text', () => {
        const appError = getAppErrorFromAxiosError(
          formatNetworkAxiosError(new AxiosError('Network Error', 'ERR_NETWORK'))
        )

        expect(appError.appEvent).toBe(AppEventCode.NO_INTERNET)
        expect(appError.technicalMessage).toBe('Network Error')
      })

      it('keeps NO_INTERNET for an unresolvable host, with the reason on the message', () => {
        const error = new AxiosError(
          'Network Error',
          'ERR_NETWORK',
          undefined,
          xhrWith('Unable to resolve host "id.example.com": No address associated with hostname')
        )

        const appError = getAppErrorFromAxiosError(formatNetworkAxiosError(error))

        expect(appError.appEvent).toBe(AppEventCode.NO_INTERNET)
        expect(appError.technicalMessage).toBe(
          'Network Error: Unable to resolve host "<host>": No address associated with hostname'
        )
      })
    })
  })

  describe('formatNetworkAxiosError', () => {
    it('replaces the bare message with the redacted native reason and keeps the code', () => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, xhrWith(TLS_NATIVE_TEXT))

      const formatted = formatNetworkAxiosError(error)

      expect(formatted.message).toBe('Network Error: Hostname <host> not verified:')
      expect(formatted.code).toBe('ERR_NETWORK')
    })

    it('is idempotent', () => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, xhrWith(TLS_NATIVE_TEXT))

      formatNetworkAxiosError(formatNetworkAxiosError(error))

      expect(error.message).toBe('Network Error: Hostname <host> not verified:')
    })

    it('leaves a response error and an axios timeout alone', () => {
      const responseError = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, xhrWith(TLS_NATIVE_TEXT), {
        status: 500,
        data: {},
      } as any)
      const timeout = new AxiosError(
        'timeout of 10000ms exceeded',
        'ECONNABORTED',
        undefined,
        xhrWith('Read timed out')
      )

      expect(formatNetworkAxiosError(responseError).message).toBe('Request failed')
      expect(formatNetworkAxiosError(timeout).message).toBe('timeout of 10000ms exceeded')
    })

    it('does not read a binary response type, where RN stores nothing and the getter throws', () => {
      const request = {
        responseType: 'arraybuffer',
        get responseText(): string {
          throw new Error('responseText is only available for text responses')
        },
      }

      const formatted = formatNetworkAxiosError(new AxiosError('Network Error', 'ERR_NETWORK', undefined, request))

      expect(formatted.message).toBe('Network Error')
    })

    describe('redaction', () => {
      const messageFor = (text: string) =>
        formatNetworkAxiosError(new AxiosError('Network Error', 'ERR_NETWORK', undefined, xhrWith(text))).message

      it('replaces hostnames and IP addresses', () => {
        expect(messageFor('Failed to connect to id.example.com/203.0.113.10:443')).toBe(
          'Network Error: Failed to connect to <host>/<host>:443'
        )
      })

      it('keeps the simple name of a package-qualified Java exception', () => {
        expect(messageFor('javax.net.ssl.SSLHandshakeException: Handshake failed')).toBe(
          'Network Error: SSLHandshakeException: Handshake failed'
        )
      })

      it('keeps the first line only, collapses whitespace and caps the length', () => {
        expect(messageFor(TLS_NATIVE_TEXT)).toBe('Network Error: Hostname <host> not verified:')
        expect(messageFor('  spaced   out \t text  ')).toBe('Network Error: spaced out text')
        expect(messageFor('x'.repeat(250))).toHaveLength('Network Error: '.length + 200)
      })
    })
  })

  describe('TLS detection', () => {
    const appEventFor = (text: string) =>
      getAppErrorFromAxiosError(
        formatNetworkAxiosError(new AxiosError('Network Error', 'ERR_NETWORK', undefined, xhrWith(text)))
      ).appEvent

    it.each([
      // Android (OkHttp / Conscrypt)
      'Unacceptable certificate: CN=COMODO RSA Certification Authority, O=COMODO CA Limited, L=Salford, ST=Greater Manchester, C=GB',
      TLS_NATIVE_TEXT,
      'java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.',
      'Chain validation failed',
      'Certificate pinning failure!\n  Peer certificate chain:\n    sha256/abc=: CN=id.example.com',
      'Pin verification failed',
      'Error while executing request: SSLHandshakeException',
      'javax.net.ssl.SSLHandshakeException: Handshake failed',
      // iOS (NSURLError)
      'The certificate for this server is invalid. You might be connecting to a server that is pretending to be “id.example.com” which could put your confidential information at risk.',
      'The certificate for this server has expired. You might be connecting to a server that is pretending to be “id.example.com” which could put your confidential information at risk.',
      'The certificate for this server was signed by an unknown certifying authority. You might be connecting to a server that is pretending to be “id.example.com” which could put your confidential information at risk.',
      'An SSL error has occurred and a secure connection to the server cannot be made.',
      'Le certificat de ce serveur est invalide.',
    ])('classifies %j as UNSECURED_NETWORK', (text) => {
      expect(appEventFor(text)).toBe(AppEventCode.UNSECURED_NETWORK)
    })

    it.each([
      // Conscrypt reports plain connection drops with TLS vocabulary
      'Read error: ssl=0x7b3c8a1200: I/O error during system call, Software caused connection abort',
      'SSL handshake aborted: ssl=0x7b3c8a1200: I/O error during system call, Connection reset by peer',
      'Unable to resolve host "id.example.com": No address associated with hostname',
      'timeout',
      'Failed to connect to id.example.com/203.0.113.10:443',
      'The request timed out.',
      'The Internet connection appears to be offline.',
    ])('keeps %j as NO_INTERNET', (text) => {
      expect(appEventFor(text)).toBe(AppEventCode.NO_INTERNET)
    })
  })

  describe('isNetworkError', () => {
    const networkCause = () => new AxiosError('Network Error: Hostname <host> not verified:', 'ERR_NETWORK')

    it('is true for an axios error that got no response', () => {
      expect(isNetworkError(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true)
      expect(isNetworkError(Object.assign(new AxiosError(), { isNetworkError: true }))).toBe(true)
    })

    it('is false for an axios timeout or a response error', () => {
      expect(isNetworkError(new AxiosError('timeout exceeded', 'ECONNABORTED'))).toBe(false)
      expect(isNetworkError(new AxiosError('Request failed', 'ERR_BAD_RESPONSE'))).toBe(false)
    })

    // The fail-open paths (client discovery, JWK retries, device count) must treat a rejected
    // certificate like the historical no_internet error
    it('is true for an UNSECURED_NETWORK AppError whose cause is a network error', () => {
      const appError = AppError.fromErrorDefinition(ErrorRegistry.UNSECURED_NETWORK, {
        cause: networkCause(),
        track: false,
      })

      expect(isNetworkError(appError)).toBe(true)
    })

    it('is true for NO_INTERNET even without a cause', () => {
      expect(isNetworkError(AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { track: false }))).toBe(true)
    })

    it('is false for an error whose cause got a response', () => {
      const cause = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 500 } as any)
      const appError = AppError.fromErrorDefinition(ErrorRegistry.SERVER_TIMEOUT, { cause, track: false })

      expect(isNetworkError(appError)).toBe(false)
    })

    it('walks a re-wrapped cause chain', () => {
      const inner = AppError.fromErrorDefinition(ErrorRegistry.UNSECURED_NETWORK, {
        cause: networkCause(),
        track: false,
      })
      const outer = AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { cause: inner, track: false })

      expect(isNetworkError(outer)).toBe(true)
    })

    it('terminates on a cyclic cause chain', () => {
      const error = AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { track: false })
      ;(error as { cause?: unknown }).cause = error

      expect(isNetworkError(error)).toBe(false)
    })

    it('is false for anything else', () => {
      expect(isNetworkError(new Error('nope'))).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
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

    // axios collapses every no-response failure into ERR_NETWORK; a rejected certificate is the one case told apart
    it('NETWORK_ERROR from a rejected certificate should resolve to UNSECURED_NETWORK AppError', () => {
      expect(getAxiosErrorDefinition('ERR_NETWORK', undefined, true)?.appEvent).toBe('unsecured_network')
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
      [409, 'conflict'], // evidence uploads suppress the modal via policy; the code stays generic
      [422, 'err_209_bad_request'], // unmapped 4xx falls back to BAD_REQUEST
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

  describe('formatAxiosErrorForLogger', () => {
    it('summarizes a binary request body instead of logging the raw bytes', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_NETWORK',
        message: 'Network Error',
        config: { method: 'put', url: 'https://store.example.com/video', data: Buffer.alloc(1_000_000) },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })

      expect((details.request as { data: unknown }).data).toBe('[binary 1000000 bytes]')
      // The 1 MB body must not survive serialization (would be MBs as a JSON number array).
      expect(JSON.stringify(details).length).toBeLessThan(1000)
    })

    it('summarizes an oversized string response body', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_BAD_RESPONSE',
        message: 'Request failed',
        config: { method: 'get', url: 'https://api.example.com/x' },
        response: { status: 500, statusText: 'Server Error', data: 'x'.repeat(5000) },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })

      expect((details.response as { data: unknown }).data).toBe('[string 5000 chars]')
    })

    it('passes small bodies through unchanged', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_BAD_REQUEST',
        message: 'Bad request',
        config: { method: 'post', url: 'https://api.example.com/x', data: { field: 'value' } },
        response: { status: 400, statusText: 'Bad Request', data: { error: 'nope' } },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })

      expect((details.request as { data: unknown }).data).toEqual({ field: 'value' })
      expect((details.response as { data: unknown }).data).toEqual({ error: 'nope' })
    })

    it('strips the query string (signed-URL token) from the logged URL', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_NETWORK',
        message: 'Network Error',
        config: { method: 'put', url: 'https://store.blob.core.windows.net/c/video.mp4?sig=TOPSECRET&se=2026' },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })

      expect(details.url).toBe('https://store.blob.core.windows.net/c/video.mp4')
      expect(JSON.stringify(details)).not.toContain('TOPSECRET')
    })

    it('redacts Authorization and Cookie request headers, preserving others', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_BAD_REQUEST',
        message: 'Bad request',
        config: {
          method: 'post',
          url: 'https://api.example.com/x',
          headers: {
            Authorization: 'Bearer JWT.TOKEN.SECRET',
            Cookie: 'session=SECRET',
            'Content-Type': 'application/json',
          },
        },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })
      const headers = (details.request as { headers: Record<string, unknown> }).headers

      expect(headers.Authorization).toBe('[redacted]')
      expect(headers.Cookie).toBe('[redacted]')
      expect(headers['Content-Type']).toBe('application/json')
      expect(JSON.stringify(details)).not.toContain('JWT.TOKEN.SECRET')
    })

    it('redacts Set-Cookie response headers', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_BAD_RESPONSE',
        message: 'Server error',
        config: { method: 'get', url: 'https://api.example.com/x' },
        response: { status: 500, statusText: 'Server Error', headers: { 'set-cookie': 'session=SECRET; HttpOnly' } },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })
      const headers = (details.response as { headers: Record<string, unknown> }).headers

      expect(headers['set-cookie']).toBe('[redacted]')
      expect(JSON.stringify(details)).not.toContain('session=SECRET')
    })

    it('does not duplicate uploadLogContext into the formatted cause, and leaves redaction/summarization untouched', () => {
      const error = {
        name: 'AxiosError',
        code: 'ERR_NETWORK',
        message: 'Network Error',
        config: {
          method: 'put',
          url: 'https://store.blob.core.windows.net/c/video.mp4?sig=TOPSECRET&se=2026',
          data: Buffer.alloc(1_000_000),
          uploadLogContext: {
            media_kind: 'video',
            media_stage: 'binary',
            media_bytes: 1_000_000,
            media_format: 'video/mp4',
          },
        },
      } as any

      const details = formatAxiosErrorForLogger({ error, suppressStackTrace: true })

      expect(details.url).toBe('https://store.blob.core.windows.net/c/video.mp4')
      expect((details.request as { data: unknown }).data).toBe('[binary 1000000 bytes]')
      expect(details).not.toHaveProperty('media_kind')
      expect(details).not.toHaveProperty('uploadLogContext')
      expect(JSON.stringify(details)).not.toContain('media_kind')
    })
  })
})
