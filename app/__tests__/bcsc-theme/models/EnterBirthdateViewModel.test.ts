import { CommonActions } from '@react-navigation/native'
import { renderHook, waitFor } from '@testing-library/react-native'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEnterBirthdateViewModel } from '@/bcsc-theme/features/verify/EnterBirthdate/EnterBirthdateViewModel'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'

const mockAuthorizeDevice = jest.fn().mockResolvedValue(null)
const mockUseApi = jest.mocked(useApi)

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
const mockDispatch = jest.fn()

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
    bcsc: {
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

    // Setup mocks
    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('authorizeDevice - device already authorized (null response)', () => {
    it('should navigate to SetupSteps when device is already authorized', async () => {
      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await result.current.authorizeDevice(mockSerial, mockBirthdate)

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalledWith(mockSerial, mockBirthdate)
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: BCDispatchAction.UPDATE_BIRTHDATE,
            payload: [mockBirthdate],
          })
        )
        expect(mockLogger.info).toHaveBeenCalledWith('Device already authorized, navigating to SetupSteps screen')
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
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
        // Verify all dispatches were called
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_BIRTHDATE,
          payload: [mockBirthdate],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_EMAIL,
          payload: [{ email: mockDeviceAuth.verified_email, emailConfirmed: true }],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_DEVICE_CODE,
          payload: [mockDeviceAuth.device_code],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_USER_CODE,
          payload: [mockDeviceAuth.user_code],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_CARD_PROCESS,
          payload: [mockDeviceAuth.process],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
          payload: [['video_call']],
        })

        // Verify device code expires at dispatch
        const dispatchCall = mockDispatch.mock.calls.find(
          (call) => call[0].type === BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT
        )
        expect(dispatchCall).toBeDefined()
        const actualExpiresAt = dispatchCall![0].payload[0]
        expect(actualExpiresAt.getTime()).toBeCloseTo(expectedExpiresAt.getTime(), -2)

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
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_EMAIL,
          payload: [{ email: undefined, emailConfirmed: false }],
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
        // Verify dispatches
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_BIRTHDATE,
          payload: [mockBirthdate],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_CARD_PROCESS,
          payload: [mockDeviceAuth.process],
        })
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
          payload: [['video_call', 'back_check']],
        })

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
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_CARD_PROCESS,
          payload: [mockDeviceAuth.process],
        })
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
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
          payload: [['video_call', 'back_check', 'counter', 'self']],
        })
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
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
          payload: [['self']],
        })
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
        const dispatchCall = mockDispatch.mock.calls.find(
          (call) => call[0].type === BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT
        )
        expect(dispatchCall).toBeDefined()

        const expiresAt = dispatchCall![0].payload[0] as Date
        const expectedMin = beforeTime + mockDeviceAuth.expires_in * 1000
        const expectedMax = afterTime + mockDeviceAuth.expires_in * 1000

        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
        expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
      })
    })
  })

  describe('authorizeDevice - dispatch order', () => {
    it('should dispatch UPDATE_BIRTHDATE before calling authorizeDevice API', async () => {
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
        // Find the index of UPDATE_BIRTHDATE dispatch
        const birthdateDispatchIndex = mockDispatch.mock.calls.findIndex(
          (call) => call[0].type === BCDispatchAction.UPDATE_BIRTHDATE
        )
        expect(birthdateDispatchIndex).toBe(0) // Should be first dispatch
      })
    })

    it('should dispatch all authorization data in correct sequence', async () => {
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
        const dispatchTypes = mockDispatch.mock.calls.map((call) => call[0].type)

        expect(dispatchTypes).toEqual([
          BCDispatchAction.UPDATE_BIRTHDATE,
          BCDispatchAction.UPDATE_EMAIL,
          BCDispatchAction.UPDATE_DEVICE_CODE,
          BCDispatchAction.UPDATE_USER_CODE,
          BCDispatchAction.UPDATE_CARD_PROCESS,
          BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT,
          BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
        ])
      })
    })
  })

  describe('authorizeDevice - error handling', () => {
    it('should propagate errors from authorization API', async () => {
      const mockError = new Error('Authorization failed')
      mockAuthorizeDevice.mockRejectedValue(mockError)

      const { result } = renderHook(() => useEnterBirthdateViewModel(mockNavigation))

      await expect(result.current.authorizeDevice(mockSerial, mockBirthdate)).rejects.toThrow('Authorization failed')

      // Verify UPDATE_BIRTHDATE was still dispatched before error
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_BIRTHDATE,
        payload: [mockBirthdate],
      })
    })
  })
})
