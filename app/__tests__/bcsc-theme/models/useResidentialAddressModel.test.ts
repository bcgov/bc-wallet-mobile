import useApi from '@/bcsc-theme/api/hooks/useApi'
import useResidentialAddressModel from '@/bcsc-theme/features/verify/_models/useResidentialAddressModel'
import { isCanadianPostalCode } from '@/bcsc-theme/utils/address-utils'
import { BCState } from '@/store'
import * as Bifold from '@bifold/core'
import { ToastType } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import Toast from 'react-native-toast-message'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/utils/address-utils')
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}))
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
    useTheme: jest.fn(),
  }
})

const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)
const mockUpdateDeviceCodes = jest.fn().mockResolvedValue(undefined)
const mockUpdateVerificationOptions = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateUserMetadata: mockUpdateUserMetadata,
    updateDeviceCodes: mockUpdateDeviceCodes,
    updateVerificationOptions: mockUpdateVerificationOptions,
  })),
}))

describe('useResidentialAddressModel', () => {
  const mockDispatch = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
  } as any

  const mockStore: any = {
    bcscSecure: {
      birthdate: new Date('1990-01-15'),
      deviceCode: null,
      deviceCodeExpiresAt: null,
      userMetadata: {
        name: {
          first: 'John',
          last: 'Doe',
          middle: 'M',
        },
        address: {
          streetAddress: '123 Main St',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
        },
      },
      additionalEvidenceData: [],
    },
  }

  const mockAuthorizationApi = {
    authorizeDeviceWithUnknownBCSC: jest.fn(),
  }

  const mockTheme = {
    Spacing: { lg: 16 },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateUserMetadata.mockClear()
    mockUpdateDeviceCodes.mockClear()
    mockUpdateVerificationOptions.mockClear()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      authorization: mockAuthorizationApi,
    } as any)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
    bifoldMock.useTheme.mockReturnValue(mockTheme as any)

    const isCanadianPostalCodeMock = jest.mocked(isCanadianPostalCode)
    isCanadianPostalCodeMock.mockReturnValue(true)
  })

  describe('Initial state', () => {
    it('should return initial form state from store', () => {
      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      expect(result.current.formState).toEqual({
        streetAddress: '123 Main St',
        city: 'Vancouver',
        province: 'BC',
        postalCode: 'V6B 1A1',
      })
      expect(result.current.formErrors).toEqual({})
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should return empty form state when no address in store', () => {
      const storeWithoutAddress = {
        bcscSecure: {
          userMetadata: null,
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutAddress, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))
      expect(result.current.formState).toEqual({ streetAddress: '', city: '', province: null, postalCode: '' })
    })
  })

  describe('handleChange', () => {
    it('should update form state when field changes', () => {
      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      act(() => {
        result.current.handleChange('streetAddress', '456 Oak Ave')
      })

      expect(result.current.formState.streetAddress).toBe('456 Oak Ave')
    })

    it('should clear field error when field changes', () => {
      const isCanadianPostalCodeMock = jest.mocked(isCanadianPostalCode)
      isCanadianPostalCodeMock.mockReturnValue(false)

      const storeWithEmptyAddress = {
        bcscSecure: {
          birthdate: new Date('1990-01-15'),
          userMetadata: {
            name: { first: 'John', last: 'Doe' },
            address: null,
          },
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithEmptyAddress, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      // Trigger validation error by submitting empty form
      act(() => {
        result.current.handleSubmit()
      })

      expect(result.current.formErrors.streetAddress).toBeDefined()

      // Change the field to clear the error
      act(() => {
        result.current.handleChange('streetAddress', 'New Address')
      })

      expect(result.current.formErrors.streetAddress).toBeUndefined()
    })
  })

  describe('handleSubmit - validation', () => {
    it('should set validation errors for empty required fields', async () => {
      const isCanadianPostalCodeMock = jest.mocked(isCanadianPostalCode)
      isCanadianPostalCodeMock.mockReturnValue(false)

      const storeWithEmptyAddress = {
        bcscSecure: {
          birthdate: new Date('1990-01-15'),
          userMetadata: {
            name: { first: 'John', last: 'Doe' },
            address: null,
          },
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithEmptyAddress, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.formErrors.streetAddress).toBeDefined()
      expect(result.current.formErrors.city).toBeDefined()
      expect(result.current.formErrors.province).toBeDefined()
      expect(result.current.formErrors.postalCode).toBeDefined()
      expect(mockUpdateUserMetadata).not.toHaveBeenCalled()
    })

    it('should set validation error for invalid postal code', async () => {
      const isCanadianPostalCodeMock = jest.mocked(isCanadianPostalCode)
      isCanadianPostalCodeMock.mockReturnValue(false)

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(result.current.formErrors.postalCode).toBeDefined()
    })
  })

  describe('handleSubmit - device already authorized', () => {
    it('should navigate to SetupSteps when device is already authorized', async () => {
      const storeWithDeviceCode = {
        ...mockStore,
        bcscSecure: {
          ...mockStore.bcscSecure,
          deviceCode: 'existing-device-code',
          deviceCodeExpiresAt: new Date(Date.now() + 3600000),
        },
      }
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithDeviceCode, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith({
        address: {
          streetAddress: '123 Main St',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
          country: 'CA',
        },
        name: {
          first: 'John',
          last: 'Doe',
          middle: 'M',
        },
      })
      expect(mockNavigation.dispatch).toHaveBeenCalled()
      expect(mockAuthorizationApi.authorizeDeviceWithUnknownBCSC).not.toHaveBeenCalled()
    })
  })

  describe('handleSubmit - device authorization', () => {
    it('should authorize device and dispatch codes on success', async () => {
      const mockDeviceAuth = {
        device_code: 'new-device-code',
        user_code: 'new-user-code',
        expires_in: 3600,
        verification_options: 'video_call back_check',
      }
      mockAuthorizationApi.authorizeDeviceWithUnknownBCSC.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockAuthorizationApi.authorizeDeviceWithUnknownBCSC).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        birthdate: '1990-01-15',
        middleNames: 'M',
        address: {
          streetAddress: '123 Main St',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
        },
      })

      expect(mockUpdateUserMetadata).toHaveBeenCalledWith({
        address: {
          streetAddress: '123 Main St',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
          country: 'CA',
        },
        name: {
          first: 'John',
          last: 'Doe',
          middle: 'M',
        },
      })
      expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({
        deviceCode: 'new-device-code',
        userCode: 'new-user-code',
        deviceCodeExpiresAt: expect.any(Date),
      })
      expect(mockUpdateVerificationOptions).toHaveBeenCalledWith(['video_call', 'back_check'])

      expect(Toast.show).toHaveBeenCalledWith({
        type: ToastType.Success,
        text1: expect.any(String),
        bottomOffset: 16,
        autoHide: true,
        visibilityTime: 1500,
      })

      expect(mockNavigation.dispatch).toHaveBeenCalled()
    })

    it('should handle device already registered (null response)', async () => {
      mockAuthorizationApi.authorizeDeviceWithUnknownBCSC.mockResolvedValue(null)

      // Store with existing device code
      const storeWithDeviceCode = {
        ...mockStore,
        bcscSecure: {
          ...mockStore.bcscSecure,
          deviceCode: 'existing-device-code',
        },
      }
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithDeviceCode, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockLogger.info).toHaveBeenCalledWith('Device has already been registered')
      expect(mockNavigation.dispatch).toHaveBeenCalled()
    })

    it('should throw error when device returns null and no deviceCode in store', async () => {
      mockAuthorizationApi.authorizeDeviceWithUnknownBCSC.mockResolvedValue(null)

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ResidentialAddressScreen.handleSubmit -> invalid state detected, no deviceCode found'
      )
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      )
    })

    it('should set isSubmitting during authorization', async () => {
      let resolveAuth: (value: any) => void
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve
      })
      mockAuthorizationApi.authorizeDeviceWithUnknownBCSC.mockReturnValue(authPromise)

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      let submitPromise: Promise<void>
      act(() => {
        submitPromise = result.current.handleSubmit()
      })

      // Wait a tick to allow isSubmitting to be set
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.isSubmitting).toBe(true)

      await act(async () => {
        resolveAuth!({
          device_code: 'test',
          user_code: 'test',
          expires_in: 3600,
          verification_options: 'video_call',
        })
        await submitPromise!
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should handle authorization error and show toast', async () => {
      const mockError = new Error('Authorization failed')
      mockAuthorizationApi.authorizeDeviceWithUnknownBCSC.mockRejectedValue(mockError)

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        try {
          await result.current.handleSubmit()
        } catch (error) {
          // Error is caught and handled internally, but we need to await it
        }
      })

      // Wait for state updates to complete
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ResidentialAddressScreen.handleSubmit -> device authorization failed',
        { error: mockError }
      )
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: expect.any(String),
        text2: expect.any(String),
        position: 'bottom',
      })
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should throw error when birthdate is missing', async () => {
      const storeWithoutBirthdate = {
        bcscSecure: {
          birthdate: null,
          deviceCode: null,
          deviceCodeExpiresAt: null,
          userMetadata: {
            name: { first: 'John', last: 'Doe' },
            address: mockStore.bcscSecure.userMetadata.address,
          },
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutBirthdate, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await expect(result.current.handleSubmit()).rejects.toThrow()
    })

    it('should throw error when user name is missing', async () => {
      const storeWithoutName = {
        bcscSecure: {
          birthdate: new Date('1990-01-15'),
          deviceCode: null,
          deviceCodeExpiresAt: null,
          userMetadata: {
            name: null,
            address: mockStore.bcscSecure.userMetadata.address,
          },
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutName, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await expect(result.current.handleSubmit()).rejects.toThrow()
    })
  })

  describe('form state updates', () => {
    it('should trim values when dispatching address metadata', async () => {
      const storeWithDeviceCode = {
        bcsc: {
          ...mockStore.bcsc,
        },
        bcscSecure: {
          ...mockStore.bcscSecure,
          deviceCode: 'existing-device-code',
          deviceCodeExpiresAt: new Date(Date.now() + 3600000),
          userMetadata: {
            name: mockStore.bcscSecure.userMetadata.name,
            address: {
              streetAddress: '  123 Main St  ',
              city: '  Vancouver  ',
              province: 'BC',
              postalCode: '  V6B 1A1  ',
            },
          },
        },
      }
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithDeviceCode as BCState, mockDispatch])

      const { result } = renderHook(() => useResidentialAddressModel({ navigation: mockNavigation }))

      await act(async () => {
        await result.current.handleSubmit()
      })
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith({
        address: {
          streetAddress: '123 Main St',
          postalCode: 'V6B 1A1',
          city: 'Vancouver',
          province: 'BC',
          country: 'CA',
        },
        name: {
          first: 'John',
          last: 'Doe',
          middle: 'M',
        },
      })
    })
  })
})
