import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  DeviceAuthFailureReason,
  getAccountSecurityMethod,
  getHideDeviceAuthPrepFlag,
  isAccountLocked,
  unlockWithDeviceSecurity,
} from 'react-native-bcsc-core'
import * as BCSCLoadingContext from '../contexts/BCSCLoadingContext'
import { useAuthentication } from './useAuthentication'
import * as useSecureActionsModule from './useSecureActions'

jest.mock('react-native-bcsc-core', () => ({
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
  DeviceAuthFailureReason: { Cancelled: 'cancelled', Error: 'error' },
  getAccountSecurityMethod: jest.fn(),
  getHideDeviceAuthPrepFlag: jest.fn(),
  isAccountLocked: jest.fn(),
  canPerformDeviceAuthentication: jest.fn(),
  unlockWithDeviceSecurity: jest.fn(),
  // Delegate to the central manual mock so the predicate can't drift from the real implementation.
  isBcscNativeError: jest.requireActual('../../../__mocks__/react-native-bcsc-core').isBcscNativeError,
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext')
jest.mock('@bifold/core')
jest.mock('@/hooks/useAlerts')

describe('useAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const mockStopLoading = jest.fn()
    jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
      startLoading: jest.fn().mockReturnValue(mockStopLoading),
    } as any)

    jest.mocked(useSecureActionsModule.default).mockReturnValue({
      handleSuccessfulAuth: jest.fn(),
    } as any)

    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    // disclaimer already dismissed — getHideDeviceAuthPrepFlag returns true
    jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(true)
    jest.mocked(Bifold.useStore).mockReturnValue([{} as any, jest.fn()])
    jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
      deviceAuthenticationErrorAlert: jest.fn(),
      deviceAuthenticationLockoutAlert: jest.fn(),
      deviceAuthenticationInterruptedAlert: jest.fn(),
    } as any)
  })

  describe('PIN mode', () => {
    it('navigates to EnterPIN when account is not locked', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(isAccountLocked).mockResolvedValue({ locked: false, remainingTime: 0 })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.EnterPIN)
    })

    it('navigates to Lockout when account is locked', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(isAccountLocked).mockResolvedValue({ locked: true, remainingTime: 60 })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(navigation.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESET',
          payload: expect.objectContaining({
            routes: [{ name: BCSCScreens.Lockout }],
          }),
        })
      )
    })
  })

  describe('native error mapping', () => {
    it('routes an unexpected native failure in unlockApp through the native mapper', async () => {
      const errorSpy = jest.fn()
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), error: errorSpy }] as any)
      jest
        .mocked(getAccountSecurityMethod)
        .mockRejectedValue(Object.assign(new Error('native failure'), { code: 'E_GET_SECURITY_METHOD_ERROR' }))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      // unlockApp swallows the error (no throw), but must log the mapped AppError with its distinct appEvent.
      await act(async () => {
        await result.current.unlockApp()
      })

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(AppEventCode.PIN_OPERATION_ERROR),
        expect.objectContaining({ appEvent: AppEventCode.PIN_OPERATION_ERROR })
      )
    })
  })

  describe('device auth mode', () => {
    describe('disclaimer screen', () => {
      it('navigates to DeviceAuthInfo when disclaimer has not been dismissed', async () => {
        jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(false)
        jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)

        const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
        const { result } = renderHook(() => useAuthentication(navigation))

        await act(async () => {
          await result.current.unlockApp()
        })

        expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthInfo)
        expect(canPerformDeviceAuthentication).not.toHaveBeenCalled()
      })

      it('navigates to DeviceAuthInfo when flag is undefined', async () => {
        jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(undefined)
        jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)

        const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
        const { result } = renderHook(() => useAuthentication(navigation))

        await act(async () => {
          await result.current.unlockApp()
        })

        expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthInfo)
      })

      it('proceeds to device auth when disclaimer has been dismissed', async () => {
        jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
        jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
        jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

        const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
        const { result } = renderHook(() => useAuthentication(navigation))

        await act(async () => {
          await result.current.unlockApp()
        })

        expect(navigation.navigate).not.toHaveBeenCalledWith(BCSCScreens.DeviceAuthInfo)
        expect(canPerformDeviceAuthentication).toHaveBeenCalled()
      })
    })

    it('calls handleSuccessfulAuth when device authentication succeeds', async () => {
      const mockHandleSuccessfulAuth = jest.fn()
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: mockHandleSuccessfulAuth,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith('Unlock your app')
      expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    })

    it.each([
      ['is cancelled', { success: false, failureReason: DeviceAuthFailureReason.Cancelled, errorCode: 10 }],
      ['errors', { success: false, failureReason: DeviceAuthFailureReason.Error, errorCode: 5 }],
      ['fails without a reason', { success: false }],
    ])('does not call handleSuccessfulAuth when device authentication %s', async (_label, unlockResult) => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue(unlockResult)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(jest.mocked(useSecureActionsModule.default)().handleSuccessfulAuth).not.toHaveBeenCalled()
    })

    it('navigates to DeviceAuthAppReset when device auth is not available', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(false)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthAppReset)
    })

    it('logs error when device authentication throws', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockRejectedValue(new Error('Device auth error'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('calls deviceAuthenticationErrorAlert when canPerformDeviceAuthentication throws', async () => {
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: mockAlert,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockRejectedValue(new Error('fail'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockAlert).toHaveBeenCalled()
    })

    it('calls deviceAuthenticationErrorAlert when unlockWithDeviceSecurity throws', async () => {
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: mockAlert,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockRejectedValue(new Error('biometric failure'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockAlert).toHaveBeenCalled()
    })

    it('calls deviceAuthenticationErrorAlert when handleSuccessfulAuth throws', async () => {
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: mockAlert,
      } as any)
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: jest.fn().mockRejectedValue(new Error('wallet error')),
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockAlert).toHaveBeenCalled()
    })
  })

  describe('performDeviceAuth', () => {
    it('calls handleSuccessfulAuth when device authentication succeeds', async () => {
      const mockHandleSuccessfulAuth = jest.fn()
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: mockHandleSuccessfulAuth,
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith('Unlock your app')
      expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    })

    it('navigates to DeviceAuthAppReset when device auth is not available', async () => {
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(false)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthAppReset)
    })

    describe('when unlockWithDeviceSecurity resolves success: false', () => {
      const setup = () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() }
        const mockHandleSuccessfulAuth = jest.fn()
        const mockStopLoading = jest.fn()
        const alerts = {
          deviceAuthenticationErrorAlert: jest.fn(),
          deviceAuthenticationLockoutAlert: jest.fn(),
          deviceAuthenticationInterruptedAlert: jest.fn(),
        }
        jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
        jest.mocked(useSecureActionsModule.default).mockReturnValue({
          handleSuccessfulAuth: mockHandleSuccessfulAuth,
        } as any)
        jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
          startLoading: jest.fn().mockReturnValue(mockStopLoading),
        } as any)
        jest.mocked(useAlertsModule.useAlerts).mockReturnValue(alerts as any)
        jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)

        const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
        const { result } = renderHook(() => useAuthentication(navigation))

        return { mockLogger, mockHandleSuccessfulAuth, mockStopLoading, alerts, result }
      }

      const runWith = async (
        unlockResult: Awaited<ReturnType<typeof unlockWithDeviceSecurity>>,
        platform: 'ios' | 'android' = 'android'
      ) => {
        Platform.OS = platform
        jest.mocked(unlockWithDeviceSecurity).mockResolvedValue(unlockResult)
        const subject = setup()

        await act(async () => {
          await subject.result.current.performDeviceAuth()
        })

        return subject
      }

      const expectOnlyAlert = (
        alerts: ReturnType<typeof setup>['alerts'],
        called: keyof ReturnType<typeof setup>['alerts']
      ) => {
        Object.entries(alerts).forEach(([name, alert]) => {
          if (name === called) {
            expect(alert).toHaveBeenCalledTimes(1)
          } else {
            expect(alert).not.toHaveBeenCalled()
          }
        })
      }

      afterEach(() => {
        Platform.OS = 'ios'
      })

      it('stays silent when the user cancelled', async () => {
        const { mockLogger, mockHandleSuccessfulAuth, mockStopLoading, alerts } = await runWith({
          success: false,
          failureReason: DeviceAuthFailureReason.Cancelled,
          errorCode: 10,
          errorMessage: 'Authentication canceled',
          deviceLocked: false,
        })

        expect(alerts.deviceAuthenticationErrorAlert).not.toHaveBeenCalled()
        expect(alerts.deviceAuthenticationLockoutAlert).not.toHaveBeenCalled()
        expect(alerts.deviceAuthenticationInterruptedAlert).not.toHaveBeenCalled()
        expect(mockLogger.error).not.toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('code=10'))
        expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
        expect(mockStopLoading).toHaveBeenCalled()
      })

      it('logs the native code and shows the interrupted alert for a system interruption', async () => {
        const { mockLogger, mockHandleSuccessfulAuth, mockStopLoading, alerts } = await runWith({
          success: false,
          failureReason: DeviceAuthFailureReason.Error,
          errorCode: 5,
          errorMessage: 'Fingerprint operation canceled.',
          deviceLocked: false,
        })

        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('code=5'), expect.any(AppError))
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('message=Fingerprint operation canceled.'),
          expect.any(AppError)
        )
        expectOnlyAlert(alerts, 'deviceAuthenticationInterruptedAlert')

        const appError = alerts.deviceAuthenticationInterruptedAlert.mock.calls[0][0] as AppError
        expect(appError).toBeInstanceOf(AppError)
        expect(appError.appEvent).toBe(AppEventCode.DEVICE_AUTHENTICATION_ERROR)
        expect(appError.technicalMessage).toContain('DEVICE_AUTH_5')
        expect(appError.technicalMessage).toContain('Fingerprint operation canceled.')
        expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
        expect(mockStopLoading).toHaveBeenCalled()
      })

      it.each([
        ['android', 7, false],
        ['android', 9, false],
        ['android', 10, true],
        ['ios', -8, undefined],
      ] as const)(
        'shows the lockout alert on %s for code %s (deviceLocked=%s)',
        async (platform, errorCode, deviceLocked) => {
          const { alerts } = await runWith(
            {
              success: false,
              failureReason: DeviceAuthFailureReason.Error,
              errorCode,
              errorMessage: 'Too many attempts',
              deviceLocked,
            },
            platform
          )

          expectOnlyAlert(alerts, 'deviceAuthenticationLockoutAlert')
        }
      )

      it('logs a locked device on the Android code 10 keyguard path as an error', async () => {
        const { mockLogger } = await runWith({
          success: false,
          failureReason: DeviceAuthFailureReason.Error,
          errorCode: 10,
          errorMessage: 'Authentication canceled',
          deviceLocked: true,
        })

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('deviceLocked=true'),
          expect.any(AppError)
        )
      })

      it('shows the interrupted alert for iOS systemCancel', async () => {
        const { alerts } = await runWith(
          {
            success: false,
            failureReason: DeviceAuthFailureReason.Error,
            errorCode: -4,
            errorMessage: 'System cancel',
          },
          'ios'
        )

        expectOnlyAlert(alerts, 'deviceAuthenticationInterruptedAlert')
      })

      it('shows the generic alert for any other native code', async () => {
        const { mockLogger, alerts } = await runWith({
          success: false,
          failureReason: DeviceAuthFailureReason.Error,
          errorCode: 11,
          errorMessage: 'No biometrics enrolled',
        })

        expectOnlyAlert(alerts, 'deviceAuthenticationErrorAlert')
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('code=11'), expect.any(AppError))
      })

      it('shows the generic alert, never a silent return, when failureReason and code are missing', async () => {
        const { mockLogger, mockHandleSuccessfulAuth, mockStopLoading, alerts } = await runWith({ success: false })

        expectOnlyAlert(alerts, 'deviceAuthenticationErrorAlert')
        const appError = alerts.deviceAuthenticationErrorAlert.mock.calls[0][0] as AppError
        expect(appError.technicalMessage).toContain('DEVICE_AUTH_UNKNOWN')
        expect(mockLogger.error).toHaveBeenCalled()
        expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
        expect(mockStopLoading).toHaveBeenCalled()
      })
    })

    it('logs error when device authentication throws', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
      jest.mocked(canPerformDeviceAuthentication).mockRejectedValue(new Error('Device auth error'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('preserves the specific appEvent when handleSuccessfulAuth throws an already-mapped AppError', async () => {
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: mockAlert,
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'key' })
      const mappedError = AppError.fromErrorDefinition(ErrorRegistry.TOKEN_SAVE_FAILED, { track: false })
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: jest.fn().mockRejectedValue(mappedError),
      } as any)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      // The mapper passes already-mapped errors through — the alert surfaces TOKEN_SAVE_FAILED,
      // not a re-wrapped UNMAPPED_NATIVE_ERROR.
      expect(mockAlert).toHaveBeenCalledWith(mappedError)
    })
  })

  describe('loading state', () => {
    it('starts and stops loading during performDeviceAuth', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading even when an error occurs', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockRejectedValue(new Error('fail'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading when device auth is not available', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(false)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading when device authentication is cancelled', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading when unlockWithDeviceSecurity throws', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockRejectedValue(new Error('biometric failure'))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading when handleSuccessfulAuth throws', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: jest.fn().mockRejectedValue(new Error('wallet error')),
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).toHaveBeenCalled()
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('does not start loading for early returns (PIN mode)', async () => {
      const mockStartLoading = jest.fn()
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(isAccountLocked).mockResolvedValue({ locked: false, remainingTime: 0 })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).not.toHaveBeenCalled()
    })

    it('does not start loading when navigating to disclaimer screen', async () => {
      jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(false)
      const mockStartLoading = jest.fn()
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).not.toHaveBeenCalled()
    })
  })
})
