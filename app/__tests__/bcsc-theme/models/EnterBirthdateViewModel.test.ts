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

      await waitFor(() => {
        // Verify all dispatches were called
        expect(mockDispatch).toHaveBeenCalledWith({
          type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION,
          payload: [mockDeviceAuth],
        })

        // Verify navigation
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
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
          type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION,
          payload: [mockDeviceAuth],
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
          type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION,
          payload: [mockDeviceAuth],
        })
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AdditionalIdentificationRequired)
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
