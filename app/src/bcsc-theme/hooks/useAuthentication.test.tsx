import { readPinLockout } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import * as storageHooks from '@/bcsc-theme/storage/hooks'
import { nativeAccount, seedAccount } from '@/bcsc-theme/storage/testing'
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
  getHideDeviceAuthPrepFlag,
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
  getHideDeviceAuthPrepFlag: jest.fn(),
  canPerformDeviceAuthentication: jest.fn(),
  unlockWithDeviceSecurity: jest.fn(),
  BcscNativeErrorCodes: jest.requireActual('../../../__mocks__/react-native-bcsc-core').BcscNativeErrorCodes,
  // Delegate to the central manual mock so the predicate can't drift from the real implementation.
  isBcscNativeError: jest.requireActual('../../../__mocks__/react-native-bcsc-core').isBcscNativeError,
}))

jest.mock('@/bcsc-theme/features/auth/services/pin-lockout-service', () => ({
  readPinLockout: jest.fn(),
}))
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext')
jest.mock('@bifold/core')
jest.mock('@/hooks/useAlerts')

const openLockout = { type: PinLockoutType.Open } as const
const lockedLockout = { type: PinLockoutType.Locked, until: new Date('2026-11-16T12:01:00.000Z') } as const
const pinAccount = { accountId: 'test-account-id', issuer: 'https://idsit.gov.bc.ca/device/' }

const seedSecurityMethod = (securityMethod: AccountSecurityMethod) => seedAccount(nativeAccount({ securityMethod }))

describe('useAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    seedAccount(nativeAccount())

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
    it.each([
      ['no wrong PINs are recorded', openLockout],
      ['one more wrong PIN would lock', { type: PinLockoutType.LastAttempt } as const],
    ])('navigates to EnterPIN when %s', async (_, lockout) => {
      seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(readPinLockout).mockResolvedValue(lockout)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.EnterPIN)
    })

    it('navigates to Lockout when PIN entry is locked', async () => {
      seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(readPinLockout).mockResolvedValue(lockedLockout)

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
      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    it('does not read the PIN lock for device authentication', async () => {
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
      jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(false)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(readPinLockout).not.toHaveBeenCalled()
    })
  })

  describe('native error mapping', () => {
    it('routes an unlock failure with no account through the native mapper', async () => {
      const errorSpy = jest.fn()
      const problemWithAppAlert = jest.fn()
      jest.mocked(Bifold.useServices).mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: errorSpy }] as any)
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: jest.fn(),
        problemWithAppAlert,
      } as any)
      seedAccount(null)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      // unlockApp does not throw, but must log the mapped AppError with its appEvent.
      await act(async () => {
        await result.current.unlockApp()
      })

      // Mapped as bcsc-core's own E_ACCOUNT_NOT_FOUND was, before the account moved to the store
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(AppEventCode.ACCOUNT_NOT_FOUND),
        expect.objectContaining({
          appEvent: AppEventCode.ACCOUNT_NOT_FOUND,
          cause: expect.any(storageHooks.NoPINAccountError),
        })
      )
      expect(problemWithAppAlert).toHaveBeenCalledTimes(1)
      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(readPinLockout).not.toHaveBeenCalled()
    })

    it('shows an error modal, and opens neither PIN entry nor Lockout, when the PIN lock cannot be read', async () => {
      const problemWithAppAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: jest.fn(),
        problemWithAppAlert,
      } as any)
      const storageError = AppError.fromErrorDefinition(ErrorRegistry.STORAGE_READ_ERROR, {
        cause: new Error('read failed'),
      })
      jest.mocked(readPinLockout).mockRejectedValue(storageError)
      seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      // The storage error reaches the alert as it is, not re-wrapped as an unmapped native error
      expect(problemWithAppAlert).toHaveBeenCalledTimes(1)
      expect(problemWithAppAlert).toHaveBeenCalledWith(storageError)
      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(navigation.dispatch).not.toHaveBeenCalled()
    })

    it('surfaces a non-cancel native device auth failure with its OS error code', async () => {
      const deviceAuthenticationErrorAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert,
        problemWithAppAlert: jest.fn(),
      } as any)
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
        seedSecurityMethod(AccountSecurityMethod.DeviceAuth)

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
        seedSecurityMethod(AccountSecurityMethod.DeviceAuth)

        const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
        const { result } = renderHook(() => useAuthentication(navigation))

        await act(async () => {
          await result.current.unlockApp()
        })

        expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.DeviceAuthInfo)
      })

      it('proceeds to device auth when disclaimer has been dismissed', async () => {
        seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'test-key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith(pinAccount, 'BCSC.Security.UnlockPrompt')
      expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    })

    it('does not call handleSuccessfulAuth when device authentication fails or is cancelled', async () => {
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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

      expect(unlockWithDeviceSecurity).toHaveBeenCalledWith(pinAccount, 'BCSC.Security.UnlockPrompt')
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

    it('shows an error modal, not the reset flow, when the prompt reports device auth unavailable', async () => {
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

      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(deviceAuthenticationErrorAlert).toHaveBeenCalledTimes(1)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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

      expect(canPerformDeviceAuthentication).toHaveBeenCalledTimes(1)
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
          seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
          jest.mocked(getHideDeviceAuthPrepFlag).mockResolvedValue(false)
        },
      ],
      [
        'EnterPIN',
        () => {
          seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)
          jest.mocked(readPinLockout).mockResolvedValue(openLockout)
        },
      ],
      [
        'Lockout',
        () => {
          seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)
          jest.mocked(readPinLockout).mockResolvedValue(lockedLockout)
        },
      ],
      [
        'an unlock error',
        () => {
          seedAccount(null)
        },
      ],
    ])('allows a new unlockApp attempt after an early return to %s', async (_, arrange) => {
      arrange()
      const accountReads = jest.spyOn(storageHooks, 'requirePINAccount')

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })
      await act(async () => {
        await result.current.unlockApp()
      })

      expect(accountReads).toHaveBeenCalledTimes(2)
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

    it('allows a new attempt after the post-auth unlock (hydration) fails', async () => {
      const mockAlert = jest.fn()
      jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
        deviceAuthenticationErrorAlert: jest.fn(),
        problemWithAppAlert: mockAlert,
      } as any)
      const mockHandleSuccessfulAuth = jest
        .fn()
        .mockRejectedValueOnce(new Error('hydration failed'))
        .mockResolvedValueOnce(undefined)
      jest.mocked(useSecureActionsModule.default).mockReturnValue({
        handleSuccessfulAuth: mockHandleSuccessfulAuth,
      } as any)
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: true, walletKey: 'key' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })
      await act(async () => {
        await result.current.unlockApp()
      })

      // The second tap re-prompts and re-runs the unlock; only the first failure is alerted
      expect(unlockWithDeviceSecurity).toHaveBeenCalledTimes(2)
      expect(mockHandleSuccessfulAuth).toHaveBeenCalledTimes(2)
      expect(mockHandleSuccessfulAuth).toHaveBeenNthCalledWith(2, 'key')
      expect(mockAlert).toHaveBeenCalledTimes(1)
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

      expect(mockStartLoading).toHaveBeenNthCalledWith(1)
      expect(mockStartLoading).toHaveBeenNthCalledWith(2, 'BCSC.Loading.AppStartup')
      expect(mockStopLoading).toHaveBeenCalledTimes(2)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
      jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
      jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).toHaveBeenCalledTimes(1)
      expect(mockStartLoading).not.toHaveBeenCalledWith('BCSC.Loading.AppStartup')
      expect(mockStopLoading).toHaveBeenCalled()
    })

    it('stops loading when unlockWithDeviceSecurity throws', async () => {
      const mockStopLoading = jest.fn()
      const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
      jest.mocked(BCSCLoadingContext.useLoadingScreen).mockReturnValue({
        startLoading: mockStartLoading,
      } as any)
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)
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
      seedSecurityMethod(AccountSecurityMethod.PinNoDeviceAuth)
      jest.mocked(readPinLockout).mockResolvedValue(openLockout)

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
      seedSecurityMethod(AccountSecurityMethod.DeviceAuth)

      const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
      const { result } = renderHook(() => useAuthentication(navigation))

      await act(async () => {
        await result.current.unlockApp()
      })

      expect(mockStartLoading).not.toHaveBeenCalled()
    })
  })
})
