import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BcscNativeErrorCodes } from 'react-native-bcsc-core'

import {
  mapNativeBcscError,
  nativeBcscErrorMap,
  throwAppError,
  throwNativeBcscError,
  toAppError,
} from './native-error-map'

jest.mock('react-native-bcsc-core')

/** Build a fake native module rejection: an Error carrying a string `code` (and optional userInfo). */
const nativeError = (code: string, message = 'native failure'): Error => Object.assign(new Error(message), { code })

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

jest.mock('react-native', () => ({
  DeviceEventEmitter: { emit: jest.fn() },
  Platform: { OS: 'ios', select: jest.fn((obj: Record<string, unknown>) => obj.ios ?? obj.default) },
}))

jest.mock('@bifold/core', () => ({
  BifoldError: class BifoldError extends Error {},
}))

jest.mock('@/utils/logger', () => ({
  appLogger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}))

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: { trackErrorEvent: jest.fn() },
}))

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}))

describe('native-error-map', () => {
  describe('toAppError', () => {
    it('wraps an Error as AppError with the given definition', () => {
      const error = new Error('something broke')
      const result = toAppError(error, ErrorRegistry.STORAGE_WRITE_ERROR)

      expect(result).toBeInstanceOf(AppError)
      expect(result.appEvent).toBe(ErrorRegistry.STORAGE_WRITE_ERROR.appEvent)
      expect(result.cause).toBe(error)
    })

    it('wraps a non-Error value as AppError', () => {
      const result = toAppError('string error', ErrorRegistry.CLAIMS_SET_ERROR)

      expect(result).toBeInstanceOf(AppError)
      expect(result.appEvent).toBe(ErrorRegistry.CLAIMS_SET_ERROR.appEvent)
    })

    it('preserves the category from the definition', () => {
      const error = new Error('test')
      const result = toAppError(error, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)

      expect(result.code).toContain('device')
    })
  })

  describe('throwAppError', () => {
    it('throws an AppError with the given definition', () => {
      const error = new Error('native failure')

      expect(() => throwAppError(error, ErrorRegistry.DECRYPT_JWE_ERROR)).toThrow(AppError)

      try {
        throwAppError(error, ErrorRegistry.DECRYPT_JWE_ERROR)
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(AppError)
        expect((thrown as AppError).appEvent).toBe(ErrorRegistry.DECRYPT_JWE_ERROR.appEvent)
        expect((thrown as AppError).cause).toBe(error)
      }
    })

    it('throws an AppError for a non-Error value', () => {
      expect(() => throwAppError(42, ErrorRegistry.STORAGE_READ_ERROR)).toThrow(AppError)
    })
  })

  describe('nativeBcscErrorMap', () => {
    it('maps every BcscNativeErrorCodes value to a definition (shared contract is fully covered)', () => {
      for (const code of Object.values(BcscNativeErrorCodes)) {
        expect(nativeBcscErrorMap.get(code)).toBeDefined()
      }
    })

    it('maps a raw-string-only native code (not in the enum) to its definition', () => {
      expect(nativeBcscErrorMap.get('E_JWE_DECRYPT_ERROR')).toBe(ErrorRegistry.DECRYPT_JWE_ERROR)
    })

    it('maps both platforms’ divergent strings for the same condition to one definition', () => {
      // iOS variant + Android variant of the same JWT encryption failure
      expect(nativeBcscErrorMap.get('E_JWT_ENCRYPTION_ERROR')).toBe(ErrorRegistry.JWT_ENCRYPTION_FAILED)
      expect(nativeBcscErrorMap.get('E_JWT_ENCRYPTION_FAILED')).toBe(ErrorRegistry.JWT_ENCRYPTION_FAILED)
      // iOS keychain-unavailable + Android keystore-unavailable → one retryable definition
      expect(nativeBcscErrorMap.get('E_120_KEYCHAIN_UNAVAILABLE_ERROR')).toBe(ErrorRegistry.KEYCHAIN_UNAVAILABLE)
      expect(nativeBcscErrorMap.get('E_KEYSTORE_UNAVAILABLE')).toBe(ErrorRegistry.KEYCHAIN_UNAVAILABLE)
    })

    it('does not map E_DEVICE_AUTH_CANCELLED (user cancel is control flow, not an error)', () => {
      expect(nativeBcscErrorMap.get('E_DEVICE_AUTH_CANCELLED')).toBeUndefined()
    })
  })

  describe('mapNativeBcscError', () => {
    it('maps a known native code to its AppError, preserving the cause', () => {
      const error = nativeError('E_JWT_SIGN_FAILED')
      const result = mapNativeBcscError(error)

      expect(result).toBeInstanceOf(AppError)
      expect(result.appEvent).toBe(ErrorRegistry.SIGN_CLAIMS_ERROR.appEvent)
      expect(result.cause).toBe(error)
    })

    it('groups Android storage-domain codes by operation', () => {
      expect(mapNativeBcscError(nativeError('E_GET_EVIDENCE_ERROR')).appEvent).toBe(
        ErrorRegistry.NATIVE_STORAGE_READ_FAILED.appEvent
      )
      expect(mapNativeBcscError(nativeError('E_SET_CREDENTIAL_ERROR')).appEvent).toBe(
        ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED.appEvent
      )
      expect(mapNativeBcscError(nativeError('E_DELETE_AUTH_REQUEST_ERROR')).appEvent).toBe(
        ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED.appEvent
      )
    })

    it('falls back to UNMAPPED_NATIVE_ERROR for an unknown native code, preserving the raw code', () => {
      const error = nativeError('E_TOTALLY_UNKNOWN_CODE', 'device gone')
      const result = mapNativeBcscError(error)

      expect(result.appEvent).toBe(ErrorRegistry.UNMAPPED_NATIVE_ERROR.appEvent)
      expect(result.statusCode).toBe(9900)
      expect(result.cause).toBe(error)
      // Raw native code is never lost — it surfaces via technicalMessage (and the error report).
      expect(result.technicalMessage).toContain('E_TOTALLY_UNKNOWN_CODE')
    })

    it('falls back to UNMAPPED_NATIVE_ERROR for a non-native error', () => {
      expect(mapNativeBcscError(new Error('plain')).appEvent).toBe(ErrorRegistry.UNMAPPED_NATIVE_ERROR.appEvent)
      expect(mapNativeBcscError('a string').appEvent).toBe(ErrorRegistry.UNMAPPED_NATIVE_ERROR.appEvent)
    })
  })

  describe('throwNativeBcscError', () => {
    it('throws the mapped AppError', () => {
      const error = nativeError('E_KEY_NOT_FOUND')

      expect(() => throwNativeBcscError(error)).toThrow(AppError)
      try {
        throwNativeBcscError(error)
      } catch (thrown) {
        expect((thrown as AppError).appEvent).toBe(ErrorRegistry.KEYCHAIN_KEY_NOT_FOUND.appEvent)
        expect((thrown as AppError).cause).toBe(error)
      }
    })
  })
})
