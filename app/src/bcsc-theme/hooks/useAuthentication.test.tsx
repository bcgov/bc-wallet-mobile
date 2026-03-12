import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
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
  isAccountLocked: jest.fn(),
  canPerformDeviceAuthentication: jest.fn(),
  unlockWithDeviceSecurity: jest.fn(),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext')
jest.mock('@bifold/core')

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

    it('does not navigate when device authentication fails or is cancelled', async () => {
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(jest.mocked(useSecureActionsModule.default)().handleSuccessfulAuth).not.toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalled()
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
  })

  describe('loading state', () => {
    it('starts and stops loading during unlockApp', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
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
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockRejectedValue(new Error('fail'))

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
  })
})
