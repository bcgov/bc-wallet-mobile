import { CommonActions } from '@react-navigation/native'
import { renderHook, waitFor } from '@testing-library/react-native'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEnterBirthdateViewModel } from '@/bcsc-theme/features/verify/EnterBirthdate/useEnterBirthdateViewModel'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as Bifold from '@bifold/core'
import { BCSCCardProcess } from 'react-native-bcsc-core'

const mockAuthorizeDevice = jest.fn().mockResolvedValue(null)
const mockUseApi = jest.mocked(useApi)

// Mock secure actions
const mockUpdateUserInfo = jest.fn()
const mockUpdateDeviceCodes = jest.fn()
const mockUpdateCardProcess = jest.fn()
const mockUpdateVerificationOptions = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions')
const mockUseSecureActions = jest.mocked(useSecureActions)

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
} as any

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

describe('EnterBirthdateViewModel', () => {
  const mockSerial = '123456789'
  const mockBirthdate = new Date('1990-01-15')
  const mockStore: any = {
    bcscSecure: {
      serial: mockSerial,
      birthdate: mockBirthdate,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseApi.mockReturnValue({
      authorization: {
        authorizeDevice: mockAuthorizeDevice,
      },
    } as any)

    mockUseSecureActions.mockReturnValue({
      updateUserInfo: mockUpdateUserInfo,
      updateDeviceCodes: mockUpdateDeviceCodes,
      updateCardProcess: mockUpdateCardProcess,
      updateVerificationOptions: mockUpdateVerificationOptions,
    } as any)

    // Setup mocks
    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('authorizeDevice - device already authorized (null response)', () => {
    it('should early return and let error policies handle', async () => {
      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({ birthdate: mockBirthdate })
        expect(mockAuthorizeDevice).toHaveBeenCalledWith(mockSerial, mockBirthdate)
        expect(mockLogger.info).not.toHaveBeenCalled()
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      })
    })
  })

  describe('authorizeDevice - BCSCPhoto process', () => {
    it('should navigate to SetupSteps for BCSCPhoto process', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      const expectedExpiresAt = new Date(Date.now() + mockDeviceAuth.expires_in * 1000)

      await waitFor(() => {
        // Verify updateUserInfo was called for birthdate
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({ birthdate: mockBirthdate })

        // Verify updateUserInfo was called for email
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({
          email: mockDeviceAuth.verified_email,
          isEmailVerified: true,
        })

        // Verify updateDeviceCodes was called
        expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({
          deviceCode: mockDeviceAuth.device_code,
          userCode: mockDeviceAuth.user_code,
          deviceCodeExpiresAt: expect.any(Date),
        })

        // Verify the expiration time is correct
        const deviceCodesCall = mockUpdateDeviceCodes.mock.calls[0][0]
        expect(deviceCodesCall.deviceCodeExpiresAt.getTime()).toBeCloseTo(expectedExpiresAt.getTime(), -2)

        // Verify updateCardProcess was called
        expect(mockUpdateCardProcess).toHaveBeenCalledWith(mockDeviceAuth.process)

        // Verify updateVerificationOptions was called
        expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call'])

        // Verify navigation
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      })
    })

    it('should handle verified email as undefined', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: undefined,
        expires_in: 3600,
        verification_options: 'video_call',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({
          email: undefined,
          isEmailVerified: false,
        })
      })
    })
  })

  describe('authorizeDevice - BCSCNonPhoto process', () => {
    it('should navigate to AdditionalIdentificationRequired for BCSCNonPhoto process', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call back_check',
        process: BCSCCardProcess.BCSCNonPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        // Verify secure actions were called
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({ birthdate: mockBirthdate })
        expect(mockUpdateCardProcess).toHaveBeenCalledWith(mockDeviceAuth.process)
        expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])

        // Verify navigation
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AdditionalIdentificationRequired)
      })
    })
  })

  describe('authorizeDevice - NonBCSC process', () => {
    it('should navigate to AdditionalIdentificationRequired for NonBCSC process', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call counter',
        process: BCSCCardProcess.NonBCSC,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockUpdateCardProcess).toHaveBeenCalledWith(mockDeviceAuth.process)
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AdditionalIdentificationRequired)
      })
    })
  })

  describe('authorizeDevice - verification options parsing', () => {
    it('should correctly split space-delimited verification options', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call back_check counter self',
        process: BCSCCardProcess.NonBCSC,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check', 'counter', 'self'])
      })
    })

    it('should handle single verification option', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'self',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['self'])
      })
    })
  })

  describe('authorizeDevice - expiration calculation', () => {
    it('should calculate correct expiration time from expires_in', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 7200, // 2 hours
        verification_options: 'video_call',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const beforeTime = Date.now()

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      const afterTime = Date.now()

      await waitFor(() => {
        expect(mockUpdateDeviceCodes).toHaveBeenCalled()

        const deviceCodesCall = mockUpdateDeviceCodes.mock.calls[0][0]
        const expiresAt = deviceCodesCall.deviceCodeExpiresAt as Date
        const expectedMin = beforeTime + mockDeviceAuth.expires_in * 1000
        const expectedMax = afterTime + mockDeviceAuth.expires_in * 1000

        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
        expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
      })
    })
  })

  describe('authorizeDevice - call order', () => {
    it('should call updateUserInfo with birthdate before calling authorizeDevice API', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        // updateUserInfo should be called first with birthdate
        expect(mockUpdateUserInfo.mock.calls[0]).toEqual([{ birthdate: mockBirthdate }])
        expect(mockAuthorizeDevice).toHaveBeenCalledWith(mockSerial, mockBirthdate)
      })
    })

    it('should call all secure actions in correct sequence', async () => {
      const mockDeviceAuth = {
        device_code: 'test-device-code',
        user_code: 'ABCD1234',
        verified_email: 'test@example.com',
        expires_in: 3600,
        verification_options: 'video_call',
        process: BCSCCardProcess.BCSCPhoto,
      }

      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        // Verify call order
        expect(mockUpdateUserInfo).toHaveBeenCalledTimes(2)
        expect(mockUpdateUserInfo.mock.calls[0]).toEqual([{ birthdate: mockBirthdate }])
        expect(mockUpdateUserInfo.mock.calls[1]).toEqual([
          { email: mockDeviceAuth.verified_email, isEmailVerified: true },
        ])
        expect(mockUpdateDeviceCodes).toHaveBeenCalledTimes(1)
        expect(mockUpdateCardProcess).toHaveBeenCalledTimes(1)
        expect(mockUpdateVerificationOptions).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('authorizeDevice - error handling', () => {
    it('should propagate errors from authorization API', async () => {
      const mockError = new Error('Authorization failed')
      mockAuthorizeDevice.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await expect(result.current.authorizeDevice(mockSerial, mockBirthdate)).rejects.toThrow('Authorization failed')

      // Verify updateUserInfo was still called before error
      expect(mockUpdateUserInfo).toHaveBeenCalledWith({ birthdate: mockBirthdate })
    })
  })
})
