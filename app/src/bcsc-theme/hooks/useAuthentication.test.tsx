import { BCSCScreens } from '@/bcsc-theme/types/navigators'
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
