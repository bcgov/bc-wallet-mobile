import * as useUserApiModule from '@/bcsc-theme/api/hooks/useUserApi'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import { useUserService } from './useUserService'

describe('useUserService', () => {
  describe('getUserInfo', () => {
    it('should call userApi.getUserInfo and return data', async () => {
      const mockData = { name: 'test user' }
      const userApi = {
        getUserInfo: jest.fn().mockResolvedValue(mockData),
      } as any

      jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useUserService())

      const data = await result.current.getUserInfo()

      expect(userApi.getUserInfo).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })

    it('should show alert on JSON deserialization error and rethrow error', async () => {
      const mockError = mockAppError(AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)
      const userApi = {
        getUserInfo: jest.fn().mockRejectedValue(mockError),
      } as any
      const mockAlerts = { failedToDeserializeJsonAlert: jest.fn() }

      jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useUserService())

      await expect(result.current.getUserInfo()).rejects.toThrow(mockError)
      expect(userApi.getUserInfo).toHaveBeenCalled()
      expect(mockAlerts.failedToDeserializeJsonAlert).toHaveBeenCalled()
    })

    it('should show alert on JWE decryption error and rethrow error', async () => {
      const mockError = mockAppError(AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE)
      const userApi = {
        getUserInfo: jest.fn().mockRejectedValue(mockError),
      } as any
      const mockAlerts = { unableToDecryptJweAlert: jest.fn() }

      jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useUserService())

      await expect(result.current.getUserInfo()).rejects.toThrow(mockError)
      expect(userApi.getUserInfo).toHaveBeenCalled()
      expect(mockAlerts.unableToDecryptJweAlert).toHaveBeenCalled()
    })
  })

  describe('getUserMetadata', () => {
    it('should call userApi.getUserInfo and userApi.getPicture and return data', async () => {
      const mockUserData = { name: 'test user', picture: 'picture-id' }
      const mockPictureUri = 'picture-uri'
      const userApi = {
        getUserInfo: jest.fn().mockResolvedValue(mockUserData),
        getPicture: jest.fn().mockResolvedValue(mockPictureUri),
      } as any

      jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useUserService())

      const data = await result.current.getUserMetadata()

      expect(userApi.getUserInfo).toHaveBeenCalled()
      expect(userApi.getPicture).toHaveBeenCalledWith('picture-id')
      expect(data).toEqual({ user: mockUserData, picture: mockPictureUri })
    })

    it('should call userApi.getUserInfo and return data with undefined picture if picture does not exist', async () => {
      const mockUserData = { name: 'test user' }
      const userApi = {
        getUserInfo: jest.fn().mockResolvedValue(mockUserData),
      } as any

      jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useUserService())

      const data = await result.current.getUserMetadata()

      expect(userApi.getUserInfo).toHaveBeenCalled()
      expect(data).toEqual({ user: mockUserData, picture: undefined })
    })
  })

  it('should return memoized functions', () => {
    const userApi = {} as any
    const mockAlerts = {} as any

    jest.spyOn(useUserApiModule, 'default').mockReturnValue(userApi)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts)

    const { result, rerender } = renderHook(() => useUserService())

    const firstGetUserInfo = result.current.getUserInfo
    const firstGetUserMetadata = result.current.getUserMetadata

    rerender(undefined)

    expect(result.current.getUserInfo).toBe(firstGetUserInfo)
    expect(result.current.getUserMetadata).toBe(firstGetUserMetadata)
  })
})
