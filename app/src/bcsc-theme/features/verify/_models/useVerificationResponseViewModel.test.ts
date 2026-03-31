import useVerificationResponseViewModel from '@/bcsc-theme/features/verify/_models/useVerificationResponseViewModel'
import * as useRegistrationServiceModule from '@/bcsc-theme/services/hooks/useRegistrationService'
import * as useTokenServiceModule from '@/bcsc-theme/services/hooks/useTokenService'
import { BCState } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

const mockGetCachedIdTokenMetadata = jest.fn().mockResolvedValue(undefined)

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

jest.mock('react-native-bcsc-core', () => ({
  isBcscNativeError: jest.fn().mockReturnValue(false),
  BcscNativeErrorCodes: {
    KEYPAIR_GENERATION_FAILED: 'E_KEYPAIR_GENERATION_FAILED',
  },
}))

const mockUpdateVerified = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateVerified: mockUpdateVerified,
    updateUserMetadata: mockUpdateUserMetadata,
  })),
}))

describe('useVerificationResponseViewModel', () => {
  const mockDispatch = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }

  const mockStore: any = {
    bcscSecure: {
      deviceCode: 'test-device-code',
      userCode: 'test-user-code',
      registrationAccessToken: 'test-registration-token',
    },
    bcsc: {
      selectedNickname: 'TestNickname',
    },
  }

  const mockRegistrationService = {
    updateRegistration: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()

    // Reset mock implementations
    mockUpdateVerified.mockResolvedValue(undefined)
    mockUpdateUserMetadata.mockResolvedValue(undefined)
    mockGetCachedIdTokenMetadata.mockResolvedValue(undefined)
    mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore as BCState, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    jest.spyOn(useRegistrationServiceModule, 'useRegistrationService').mockReturnValue(mockRegistrationService as any)
    jest.spyOn(useTokenServiceModule, 'useTokenService').mockReturnValue({
      getCachedIdTokenMetadata: mockGetCachedIdTokenMetadata,
    } as any)
  })

  describe('Initial state', () => {
    it('should return initial state with handleAccountSetup function', () => {
      const { result } = renderHook(() => useVerificationResponseViewModel())

      expect(result.current.isSettingUpAccount).toBe(false)
      expect(result.current.handleAccountSetup).toBeDefined()
    })
  })

  describe('handleAccountSetup', () => {
    it('should complete account setup successfully with all operations', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
      expect(mockRegistrationService.updateRegistration).toHaveBeenCalledWith('test-registration-token', 'TestNickname')
      expect(mockGetCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: true })
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
    })

    it('should set isSettingUpAccount to true during setup', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      // Initially false
      expect(result.current.isSettingUpAccount).toBe(false)

      const setupPromise = await act(async () => {
        await result.current.handleAccountSetup()
      })

      await setupPromise

      // Should be false after completion
      expect(result.current.isSettingUpAccount).toBe(false)
    })

    it('should set isSettingUpAccount to false even when an error occurs', async () => {
      mockRegistrationService.updateRegistration.mockRejectedValue(new Error('Device code error'))

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(result.current.isSettingUpAccount).toBe(false)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should log error if checkDeviceCodeStatus fails', async () => {
      const errorMessage = 'Device code validation failed'
      mockRegistrationService.updateRegistration.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to update registration: ${errorMessage}`)
      )
    })

    it('should still perform token refresh and mark verified even when registration update is skipped', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
      expect(mockRegistrationService.updateRegistration).toHaveBeenCalled()
      expect(mockGetCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: true })
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
    })

    it('should mark account as verified', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
    })

    it('should clean up user metadata by setting it to null', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
    })

    it('should update registration with token and nickname', async () => {
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockRegistrationService.updateRegistration).toHaveBeenCalledWith('test-registration-token', 'TestNickname')
    })

    it('should handle error when updateRegistration fails', async () => {
      const registrationError = new Error('Registration update failed')
      mockRegistrationService.updateRegistration.mockRejectedValue(registrationError)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalled()
      expect(result.current.isSettingUpAccount).toBe(false)
    })

    it('should handle non-Error objects thrown as exceptions', async () => {
      mockRegistrationService.updateRegistration.mockRejectedValue('String error')

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update registration: String error')
      )
    })

    it('should handle error with no message gracefully', async () => {
      mockRegistrationService.updateRegistration.mockRejectedValue({})

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should not throw when updateVerified fails', async () => {
      mockUpdateVerified.mockRejectedValue(new Error('Update verified failed'))

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await expect(
        act(async () => {
          await result.current.handleAccountSetup()
        })
      ).resolves.not.toThrow()
    })
  })

  describe('Complex scenarios', () => {
    it('should complete full account setup flow successfully', async () => {
      mockUpdateVerified.mockResolvedValue(undefined)
      mockUpdateUserMetadata.mockResolvedValue(undefined)
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)
      mockGetCachedIdTokenMetadata.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Verify all operations were called in order:
      // updateUserMetadata → updateRegistration → token refresh → updateVerified
      const calls = [
        mockUpdateUserMetadata.mock.invocationCallOrder[0],
        mockRegistrationService.updateRegistration.mock.invocationCallOrder[0],
        mockGetCachedIdTokenMetadata.mock.invocationCallOrder[0],
        mockUpdateVerified.mock.invocationCallOrder[0],
      ]

      for (let i = 1; i < calls.length; i++) {
        expect(calls[i]).toBeGreaterThan(calls[i - 1])
      }
    })

    it('should not call updateVerified when token refresh fails', async () => {
      mockUpdateUserMetadata.mockResolvedValue(undefined)
      mockRegistrationService.updateRegistration.mockResolvedValue(undefined)
      mockGetCachedIdTokenMetadata.mockRejectedValue(new Error('Token refresh failed'))

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to clean up verification process'))
      expect(mockUpdateVerified).not.toHaveBeenCalled()
      expect(result.current.isSettingUpAccount).toBe(false)
    })

    it('should handle case where device code is missing', async () => {
      const storeWithoutDeviceCode: any = {
        bcscSecure: {
          deviceCode: null,
          userCode: 'test-user-code',
          registrationAccessToken: 'test-registration-token',
        },
        bcsc: {
          selectedNickname: 'TestNickname',
        },
      }

      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutDeviceCode as BCState, mockDispatch])

      const { result } = renderHook(() => useVerificationResponseViewModel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Should still proceed with other operations even without device code
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
      expect(mockGetCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: true })
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
    })
  })
})
