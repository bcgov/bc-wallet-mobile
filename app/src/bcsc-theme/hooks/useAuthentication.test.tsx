import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
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
  getAccountSecurityMethod: jest.fn(),
  getHideDeviceAuthPrepFlag: jest.fn(),
  isAccountLocked: jest.fn(),
  canPerformDeviceAuthentication: jest.fn(),
  unlockWithDeviceSecurity: jest.fn(),
  BcscNativeErrorCodes: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BcscNativeErrorCodes,
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

    jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }] as any)

    // disclaimer already dismissed — getHideDeviceAuthPrepFlag returns true
    jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(true)
    jest.mocked(Bifold.useStore).mockReturnValue([{} as any, jest.fn()])
    jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
      deviceAuthenticationErrorAlert: jest.fn(),
      problemWithAppAlert: jest.fn(),
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
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: errorSpy }] as any)
      jest
        .mocked(getAccountSecurityMethod)
        .mockRejectedValue(Object.assign(new Error('native failure'), { code: 'E_GET_SECURITY_METHOD_ERROR' }))

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      // unlockApp does not throw, but must log the mapped AppError with its distinct appEvent.
      await act(async () => {
        await result.current.unlockApp()
      })

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(AppEventCode.PIN_OPERATION_ERROR),
        expect.objectContaining({ appEvent: AppEventCode.PIN_OPERATION_ERROR })
      )
    })

    it('shows an error modal when unlockApp fails before device auth, instead of doing nothing', async () => {
      const problemWithAppAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: jest.fn(),
        problemWithAppAlert,
      } as any)
      jest
        .mocked(isAccountLocked)
        .mockRejectedValue(Object.assign(new Error('native failure'), { code: 'E_IS_ACCOUNT_LOCKED_ERROR' }))
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(problemWithAppAlert).toHaveBeenCalledTimes(1)
      expect(problemWithAppAlert).toHaveBeenCalledWith(
        expect.objectContaining({ appEvent: AppEventCode.PIN_OPERATION_ERROR })
      )
      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    it('surfaces a non-cancel native device auth failure with its OS error code', async () => {
      const deviceAuthenticationErrorAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert,
        problemWithAppAlert: jest.fn(),
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockRejectedValue(
        Object.assign(new Error('Device authentication failed: LAError.systemCancel (-4): Cancelled by system'), {
          code: 'E_DEVICE_AUTH_FAILED',
        })
      )

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(deviceAuthenticationErrorAlert).toHaveBeenCalledTimes(1)
      const appError = deviceAuthenticationErrorAlert.mock.calls[0][0] as AppError
      expect(appError.appEvent).toBe(AppEventCode.DEVICE_AUTHENTICATION_ERROR)
      expect(appError.technicalMessage).toContain('E_DEVICE_AUTH_FAILED')
      expect(appError.technicalMessage).toContain('LAError.systemCancel (-4)')
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

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith('BCSC.Security.UnlockPrompt')
      expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    })

    it('does not call handleSuccessfulAuth when device authentication fails or is cancelled', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })

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
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
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

    it('calls problemWithAppAlert, not deviceAuthenticationErrorAlert, when handleSuccessfulAuth throws', async () => {
      const mockDeviceAuthAlert = jest.fn()
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: mockDeviceAuthAlert,
        problemWithAppAlert: mockAlert,
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

      expect(mockAlert).toHaveBeenCalledTimes(1)
      expect(mockDeviceAuthAlert).not.toHaveBeenCalled()
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

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith('BCSC.Security.UnlockPrompt')
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

    it('navigates to DeviceAuthAppReset, without an error modal, when the prompt reports device auth unavailable', async () => {
      const deviceAuthenticationErrorAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert,
        problemWithAppAlert: jest.fn(),
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockRejectedValue(
        Object.assign(new Error('Device authentication unavailable: ERROR_NO_DEVICE_CREDENTIAL (14): No PIN set'), {
          code: 'E_DEVICE_AUTH_UNAVAILABLE',
        })
      )

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthAppReset)
      expect(deviceAuthenticationErrorAlert).not.toHaveBeenCalled()
    })

    it('shows an error modal, not the reset flow, for other errors in the DEVICE_AUTH_UNAVAILABLE group', async () => {
      // E_NO_ACTIVITY shares the DEVICE_AUTH_UNAVAILABLE definition but is not an unenrolled device
      const deviceAuthenticationErrorAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert,
        problemWithAppAlert: jest.fn(),
      } as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest
        .mocked(unlockWithDeviceSecurity)
        .mockRejectedValue(
          Object.assign(new Error('No FragmentActivity available for authentication'), { code: 'E_NO_ACTIVITY' })
        )

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(deviceAuthenticationErrorAlert).toHaveBeenCalledTimes(1)
    })

    it('does not call handleSuccessfulAuth when device authentication is cancelled', async () => {
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(jest.mocked(useSecureActionsModule.default)().handleSuccessfulAuth).not.toHaveBeenCalled()
    })

    it('logs the native cancel reason', async () => {
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
      jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest
        .mocked(unlockWithDeviceSecurity)
        .mockResolvedValue({ success: false, reason: 'LAError.userCancel (-2): Canceled by user.' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cancelled: LAError.userCancel (-2): Canceled by user.')
      )
    })

    it('logs error when device authentication throws', async () => {
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
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
        deviceAuthenticationErrorAlert: jest.fn(),
        problemWithAppAlert: mockAlert,
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

  describe('double-tap prevention', () => {
    // Holds the native prompt open until the returned function is called
    const deferredUnlock = () => {
      let open!: () => void
      const gate = new Promise<void>((r) => {
        open = r
      })
      jest
        .mocked(unlockWithDeviceSecurity)
        .mockImplementation(() => gate.then(() => ({ success: true, walletKey: 'key' })))
      return open
    }

    it('logs a warning when a tap is ignored, so a stuck unlock is never silent', async () => {
      const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
      jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      const resolveUnlock = deferredUnlock()

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        const first = result.current.unlockApp()
        await result.current.unlockApp()
        resolveUnlock()
        await first
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('an unlock is already in progress'))
    })

    it('ignores a second unlockApp call while the first is in flight', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      const resolveUnlock = deferredUnlock()

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        const first = result.current.unlockApp()
        const second = result.current.unlockApp()
        await second
        resolveUnlock()
        await first
      })

      expect(getAccountSecurityMethod).toHaveBeenCalledTimes(1)
      expect(unlockWithDeviceSecurity).toHaveBeenCalledTimes(1)
    })

    it('ignores a second performDeviceAuth call while the first is in flight', async () => {
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      const resolveUnlock = deferredUnlock()

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        const first = result.current.performDeviceAuth()
        const second = result.current.performDeviceAuth()
        await second
        resolveUnlock()
        await first
      })

      expect(unlockWithDeviceSecurity).toHaveBeenCalledTimes(1)
    })

    it.each([
      [
        'DeviceAuthInfo',
        () => {
          jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
          jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(false)
        },
      ],
      [
        'EnterPIN',
        () => {
          jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
          jest.mocked(isAccountLocked).mockResolvedValue({ locked: false, remainingTime: 0 })
        },
      ],
      [
        'Lockout',
        () => {
          jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
          jest.mocked(isAccountLocked).mockResolvedValue({ locked: true, remainingTime: 60 })
        },
      ],
      [
        'an unlock error',
        () => {
          jest.mocked(getAccountSecurityMethod).mockRejectedValue(new Error('storage failure'))
        },
      ],
    ])('allows a new unlockApp attempt after an early return to %s', async (_, arrange) => {
      arrange()

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })
      await act(async () => {
        await result.current.unlockApp()
      })

      expect(getAccountSecurityMethod).toHaveBeenCalledTimes(2)
    })

    it('allows a new attempt after the previous one fails', async () => {
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockRejectedValueOnce(new Error('biometric failure'))
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValueOnce({ success: true, walletKey: 'key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.performDeviceAuth()
      })
      await act(async () => {
        await result.current.performDeviceAuth()
      })

      expect(unlockWithDeviceSecurity).toHaveBeenCalledTimes(2)
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
