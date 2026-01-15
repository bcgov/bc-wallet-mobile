import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { DeviceEventEmitter } from 'react-native'

import i18next from 'i18next'
import { ErrorCategory, ErrorRegistry, ErrorSeverity } from '../errors/errorRegistry'
import { AppEventCode } from '../events/appEventCode'
import { showAlert } from '../utils/alert'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'
import { ErrorAlertProvider, useErrorAlert } from './ErrorAlertContext'

// Mock dependencies
jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios ?? obj.default),
  },
}))

// Mock errorHandler utilities - use actual implementations
jest.mock('../errors/errorHandler', () => {
  const actual = jest.requireActual('../errors/errorHandler')
  return { ...actual }
})

jest.mock('@bifold/core', () => ({
  BifoldError: class BifoldError extends Error {
    title: string
    description: string
    code: number
    constructor(title: string, description: string, message: string, code: number) {
      super(message)
      this.title = title
      this.description = description
      this.code = code
    }
  },
  EventTypes: {
    ERROR_ADDED: 'ERROR_ADDED',
    ERROR_REMOVED: 'ERROR_REMOVED',
  },
}))

const { BifoldError, EventTypes } = jest.requireMock('@bifold/core')

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock('i18next', () => ({
  t: (key: string) => key,
}))

jest.mock('../utils/alert', () => ({
  showAlert: jest.fn(),
}))

jest.mock('../utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackErrorEvent: jest.fn(),
    trackAlertDisplayEvent: jest.fn(),
    trackAlertActionEvent: jest.fn(),
  },
}))

jest.mock('../utils/logger', () => ({
  appLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('ErrorAlertContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => <ErrorAlertProvider>{children}</ErrorAlertProvider>

  describe('useErrorAlert hook', () => {
    it('should throw error when used outside ErrorAlertProvider', () => {
      expect(() => renderHook(() => useErrorAlert())).toThrow('useErrorAlert must be used within an ErrorAlertProvider')
    })

    it('should return context with error, errorAsAlert, alert, and dismiss', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      expect(result.current).toHaveProperty('emitError')
      expect(result.current).toHaveProperty('errorAsAlert')
      expect(result.current).toHaveProperty('emitAlert')
      expect(result.current).toHaveProperty('dismiss')
    })
  })

  describe('error()', () => {
    it('should show error modal by default', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('GENERAL_ERROR')
      })

      expect(appLogger.error).toHaveBeenCalled()
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.any(BifoldError))
    })

    it('should not show modal when showModal is false', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('GENERAL_ERROR', { showModal: false })
      })

      expect(appLogger.error).toHaveBeenCalled()
      expect(DeviceEventEmitter.emit).not.toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.anything())
    })

    it('should track analytics', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('CAMERA_BROKEN')
      })

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(ErrorRegistry.CAMERA_BROKEN.statusCode),
        message: ErrorRegistry.CAMERA_BROKEN.appEvent,
      })
      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(ErrorRegistry.CAMERA_BROKEN.appEvent)
    })

    it('should fallback to GENERAL_ERROR for unknown keys', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('UNKNOWN_KEY' as any)
      })

      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error key'))
      expect(DeviceEventEmitter.emit).toHaveBeenCalled()
    })

    it('should extract error message from Error object', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const testError = new Error('Test error message')

      act(() => {
        result.current.emitError('GENERAL_ERROR', { error: testError })
      })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ technicalMessage: 'Test error message' })
      )
    })

    it('should include additional context in logs', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('GENERAL_ERROR', { context: { userId: '123' } })
      })

      expect(appLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ userId: '123' }))
    })

    it('should log error details with category and severity', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitError('NO_INTERNET', { error: new Error('Network failed') })
      })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.ERROR,
        })
      )
    })
  })

  describe('errorAsAlert()', () => {
    it('should show native alert instead of modal', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.errorAsAlert('NO_INTERNET')
      })

      expect(appLogger.error).toHaveBeenCalled()
      expect(showAlert).toHaveBeenCalledWith(
        ErrorRegistry.NO_INTERNET.titleKey,
        ErrorRegistry.NO_INTERNET.descriptionKey,
        undefined,
        ErrorRegistry.NO_INTERNET.appEvent
      )
      expect(DeviceEventEmitter.emit).not.toHaveBeenCalledWith(EventTypes.ERROR_ADDED, expect.anything())
    })

    it('should show native alert with custom actions', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const actions = [{ text: 'Retry', onPress: jest.fn() }]

      act(() => {
        result.current.errorAsAlert('NO_INTERNET', { actions })
      })

      expect(showAlert).toHaveBeenCalledWith(
        ErrorRegistry.NO_INTERNET.titleKey,
        ErrorRegistry.NO_INTERNET.descriptionKey,
        actions,
        ErrorRegistry.NO_INTERNET.appEvent
      )
    })

    it('should track analytics for native alerts', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.errorAsAlert('SERVER_ERROR')
      })

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: String(ErrorRegistry.SERVER_ERROR.statusCode),
        message: ErrorRegistry.SERVER_ERROR.appEvent,
      })
      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(ErrorRegistry.SERVER_ERROR.appEvent)
    })

    it('should fallback to GENERAL_ERROR for unknown keys', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.errorAsAlert('UNKNOWN_KEY' as any)
      })

      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error key'))
    })
  })

  describe('alert()', () => {
    it('should show native alert', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitAlert(i18next.t('Global.General'), i18next.t('Global.General'), {
          event: AppEventCode.GENERAL,
        })
      })

      expect(showAlert).toHaveBeenCalledWith(
        i18next.t('Global.General'),
        i18next.t('Global.General'),
        undefined,
        AppEventCode.GENERAL
      )
    })
  })

  describe('dismiss()', () => {
    it('should emit ERROR_REMOVED event', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.dismiss()
      })

      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(EventTypes.ERROR_REMOVED)
    })
  })
})
