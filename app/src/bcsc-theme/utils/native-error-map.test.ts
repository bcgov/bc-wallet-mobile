import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'

import { throwAppError, toAppError } from './native-error-map'

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
})
