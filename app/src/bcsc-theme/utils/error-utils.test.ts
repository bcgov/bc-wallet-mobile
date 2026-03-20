import { UNKNOWN_APP_ERROR_STATUS_CODE } from '@/constants'
import { AppError } from '@/errors/appError'
import { ErrorCategory, ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { BifoldError } from '@bifold/core'
import { formatIasAxiosResponseError, getAppErrorFromAxiosError, toBifoldError } from './error-utils'

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
})
