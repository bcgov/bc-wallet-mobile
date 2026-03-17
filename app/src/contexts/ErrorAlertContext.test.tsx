import { act, renderHook } from '@testing-library/react-native'
import i18next from 'i18next'
import React from 'react'
import { ErrorCategory, ErrorRegistry, ErrorSeverity } from '../errors/errorRegistry'
import { AppEventCode } from '../events/appEventCode'
import { showAlert } from '../utils/alert'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'
import { ErrorAlertProvider, useErrorAlert } from './ErrorAlertContext'

jest.mock('@/errors/components/ErrorModal', () => ({
  BCSCErrorModal: () => null,
}))

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Modal: 'Modal',
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios ?? obj.default),
  },
}))

jest.mock('../errors/errorHandler', () => {
  const actual = jest.requireActual('../errors/errorHandler')
  return { ...actual }
})

jest.mock('@bifold/core', () => ({
  testIdWithKey: (key: string) => `com.aries.bifold:id/${key}`,
  useTheme: () => ({
    ColorPalette: {
      grayscale: {
        black: '#000000',
        darkGrey: '#313132',
        mediumGrey: '#606060',
        lightGrey: '#D3D3D3',
        white: '#FFFFFF',
      },
      brand: {
        primary: '#003366',
        primaryDisabled: '#757575',
        modalPrimary: '#FCBA19',
        link: '#1A5A96',
        text: '#01264C',
      },
      semantic: { success: '#2E8540' },
      notification: { popupOverlay: 'rgba(0, 0, 0, 0.5)' },
    },
  }),
}))

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

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

describe('ErrorAlertContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => <ErrorAlertProvider>{children}</ErrorAlertProvider>

  describe('useErrorAlert hook', () => {
    it('should throw error when used outside ErrorAlertProvider', () => {
      expect(() => renderHook(() => useErrorAlert())).toThrow('useErrorAlert must be used within an ErrorAlertProvider')
    })

    it('should return context with emitErrorModal, emitAlert, and dismiss', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      expect(result.current).toHaveProperty('emitErrorModal')
      expect(result.current).toHaveProperty('emitAlert')
      expect(result.current).toHaveProperty('dismiss')
    })
  })

  describe('emitErrorModal()', () => {
    it('should log and track analytics', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitErrorModal('GENERAL_ERROR')
      })

      expect(appLogger.error).toHaveBeenCalled()
    })

    it('should track analytics', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitErrorModal('CAMERA_BROKEN')
      })

      expect(Analytics.trackErrorEvent).toHaveBeenCalledWith({
        code: ErrorRegistry.CAMERA_BROKEN.appEvent,
        message: '',
      })
      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(ErrorRegistry.CAMERA_BROKEN.appEvent)
    })

    it('should fallback to GENERAL_ERROR for unknown keys', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitErrorModal('UNKNOWN_KEY' as any)
      })

      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown error key'))
      expect(appLogger.error).toHaveBeenCalled()
    })

    it('should extract error message from Error object', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const testError = new Error('Test error message')

      act(() => {
        result.current.emitErrorModal('GENERAL_ERROR', { error: testError })
      })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ technicalMessage: 'Test error message' })
      )
    })

    it('should include additional context in logs', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitErrorModal('GENERAL_ERROR', { context: { userId: '123' } })
      })

      expect(appLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ userId: '123' }))
    })

    it('should log error details with category and severity', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })

      act(() => {
        result.current.emitErrorModal('NO_INTERNET', { error: new Error('Network failed') })
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

  describe('emitAlert()', () => {
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
})
