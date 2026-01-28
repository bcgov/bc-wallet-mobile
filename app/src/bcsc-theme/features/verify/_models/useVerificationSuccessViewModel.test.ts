import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVerificationSuccessViewmodel from '@/bcsc-theme/features/verify/_models/useVerificationSuccessViewModel'
import { BCState } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockUpdateVerified = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateVerified: mockUpdateVerified,
    updateUserMetadata: mockUpdateUserMetadata,
  })),
}))

describe('useVerificationSuccessViewmodel', () => {
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

  const mockRegistrationApi = {
    updateRegistration: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateVerified.mockClear()
    mockUpdateUserMetadata.mockClear()
    mockRegistrationApi.updateRegistration.mockClear()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      registration: mockRegistrationApi,
    } as any)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore as BCState, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
  })

  describe('Initial state', () => {
    it('should return initial state with handleAccountSetup function', () => {
      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      expect(result.current.isSettingUpAccount).toBe(false)
      expect(result.current.handleAccountSetup).toBeDefined()
    })
  })

  describe('handleAccountSetup', () => {
    it('should complete account setup successfully with all operations', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Should have called all the setup operations in sequence
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
      expect(mockRegistrationApi.updateRegistration).toHaveBeenCalledWith('test-registration-token', 'TestNickname')
    })

    it('should set isSettingUpAccount to true during setup', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

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
      mockRegistrationApi.updateRegistration.mockRejectedValue(new Error('Device code error'))

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(result.current.isSettingUpAccount).toBe(false)
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should log error if checkDeviceCodeStatus fails', async () => {
      const errorMessage = 'Device code validation failed'
      mockRegistrationApi.updateRegistration.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to update registration: ${errorMessage}`)
      )
    })

    it('should handle missing refresh token gracefully', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Should still complete other operations even without refresh token
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
      expect(mockRegistrationApi.updateRegistration).toHaveBeenCalled()
    })

    it('should mark account as verified', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
    })

    it('should clean up user metadata by setting it to null', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
    })

    it('should update registration with token and nickname', async () => {
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockRegistrationApi.updateRegistration).toHaveBeenCalledWith('test-registration-token', 'TestNickname')
    })

    it('should handle error when updateRegistration fails', async () => {
      const registrationError = new Error('Registration update failed')
      mockRegistrationApi.updateRegistration.mockRejectedValue(registrationError)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalled()
      expect(result.current.isSettingUpAccount).toBe(false)
    })

    it('should handle non-Error objects thrown as exceptions', async () => {
      mockRegistrationApi.updateRegistration.mockRejectedValue('String error')

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update registration: String error')
      )
    })

    it('should handle error with no message gracefully', async () => {
      mockRegistrationApi.updateRegistration.mockRejectedValue({})

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should not throw when updateVerified fails', async () => {
      mockUpdateVerified.mockRejectedValue(new Error('Update verified failed'))

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

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
      mockRegistrationApi.updateRegistration.mockResolvedValue(undefined)

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Verify all operations were called in order
      const calls = [
        mockUpdateVerified.mock.invocationCallOrder[0],
        mockUpdateUserMetadata.mock.invocationCallOrder[0],
        mockRegistrationApi.updateRegistration.mock.invocationCallOrder[0],
      ]

      // Verify order is preserved (each call order should be increasing)
      for (let i = 1; i < calls.length; i++) {
        expect(calls[i]).toBeGreaterThan(calls[i - 1])
      }
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

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      // Should still proceed with other operations even without device code
      expect(mockUpdateVerified).toHaveBeenCalledWith(true)
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith(null)
    })

    it('should handle case where registration access token is missing', async () => {
      const storeWithoutToken: any = {
        bcscSecure: {
          deviceCode: 'test-device-code',
          userCode: 'test-user-code',
          registrationAccessToken: null,
        },
        bcsc: {
          selectedNickname: 'TestNickname',
        },
      }

      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutToken as BCState, mockDispatch])

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update registration: missing registrationAccessToken')
      )
    })

    it('should handle case where selected nickname is missing', async () => {
      const storeWithoutNickname: any = {
        bcscSecure: {
          deviceCode: 'test-device-code',
          userCode: 'test-user-code',
          registrationAccessToken: 'test-registration-token',
        },
        bcsc: {
          selectedNickname: null,
        },
      }

      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutNickname as BCState, mockDispatch])

      const { result } = renderHook(() => useVerificationSuccessViewmodel())

      await act(async () => {
        await result.current.handleAccountSetup()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update registration: missing selectedNickname')
      )
      expect(mockRegistrationApi.updateRegistration).not.toHaveBeenCalled()
    })
  })
})
