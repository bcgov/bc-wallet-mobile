import { act, renderHook } from '@testing-library/react-native'
import i18next from 'i18next'
import React from 'react'
import { AppError } from '../errors/appError'
import { ErrorCategory } from '../errors/errorRegistry'
import { AppEventCode } from '../events/appEventCode'
import { showAlert } from '../utils/alert'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'
import { ErrorAlertProvider, useErrorAlert } from './ErrorAlertContext'

const mockBCSCErrorModal = jest.fn(() => null)
jest.mock('@/errors/components/ErrorModal', () => ({
  BCSCErrorModal: (props: any) => mockBCSCErrorModal(props),
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
    it('should track alert display event in analytics', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const appError = new AppError(
        'Something went wrong',
        {
          category: ErrorCategory.GENERAL,
          appEvent: AppEventCode.GENERAL,
          statusCode: 2800,
        },
        { track: false }
      )

      act(() => {
        result.current.emitErrorModal('Error Title', 'Error Description', appError)
      })

      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledWith(AppEventCode.GENERAL)
    })

    it('should track error event via appError.track()', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const appError = new AppError(
        'Something went wrong',
        {
          category: ErrorCategory.GENERAL,
          appEvent: AppEventCode.GENERAL,
          statusCode: 2800,
        },
        { track: false }
      )
      const trackSpy = jest.spyOn(appError, 'track')

      act(() => {
        result.current.emitErrorModal('Error Title', 'Error Description', appError)
      })

      expect(trackSpy).toHaveBeenCalled()
    })

    it('should log error details via appLogger.error', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const appError = new AppError(
        'Something went wrong',
        {
          category: ErrorCategory.GENERAL,
          appEvent: AppEventCode.GENERAL,
          statusCode: 2800,
        },
        { track: false }
      )

      act(() => {
        result.current.emitErrorModal('Error Title', 'Error Description', appError)
      })

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[${appError.code}]`),
        expect.objectContaining({
          title: 'Error Title',
          description: 'Error Description',
          name: 'AppError',
          message: 'Something went wrong',
        })
      )
    })

    it('should set error modal payload with correct fields', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const cause = new Error('root cause')
      const appError = new AppError(
        'Something went wrong',
        {
          category: ErrorCategory.NETWORK,
          appEvent: AppEventCode.NO_INTERNET,
          statusCode: 2100,
        },
        { track: false, cause }
      )

      act(() => {
        result.current.emitErrorModal('No Internet', 'Check your connection', appError)
      })

      expect(mockBCSCErrorModal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            title: 'No Internet',
            description: 'Check your connection',
            message: appError.fullMessage,
            code: 2100,
            appEvent: AppEventCode.NO_INTERNET,
            cause,
          }),
          errorKey: 1,
        })
      )
    })

    it('should increment errorKey on each call for re-render', () => {
      const { result } = renderHook(() => useErrorAlert(), { wrapper })
      const appError = new AppError(
        'Error',
        {
          category: ErrorCategory.GENERAL,
          appEvent: AppEventCode.GENERAL,
          statusCode: 2800,
        },
        { track: false }
      )

      act(() => {
        result.current.emitErrorModal('Title 1', 'Desc 1', appError)
      })

      act(() => {
        result.current.emitErrorModal('Title 2', 'Desc 2', appError)
      })

      // Two calls should have triggered two trackAlertDisplayEvent calls
      expect(Analytics.trackAlertDisplayEvent).toHaveBeenCalledTimes(2)
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
