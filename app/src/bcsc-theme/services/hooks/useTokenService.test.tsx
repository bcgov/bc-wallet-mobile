import * as useTokenApiModule from '@/bcsc-theme/api/hooks/useTokens'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import { useTokenService } from './useTokenService'

describe('useTokenService', () => {
  describe('getCachedIdTokenMetadata', () => {
    it('should call tokenApi.getCachedIdTokenMetadata and return data', async () => {
      const mockData = { metadata: 'test' }
      const tokenApi = {
        getCachedIdTokenMetadata: jest.fn().mockResolvedValue(mockData),
      } as any

      jest.spyOn(useTokenApiModule, 'default').mockReturnValue(tokenApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useTokenService())

      const data = await result.current.getCachedIdTokenMetadata({ refreshCache: true })

      expect(tokenApi.getCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: true })
      expect(data).toEqual(mockData)
    })

    it('should show alert on decryption error and rethrow error', async () => {
      const mockError = mockAppError(AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN)
      const tokenApi = {
        getCachedIdTokenMetadata: jest.fn().mockRejectedValue(mockError),
      } as any
      const mockAlerts = { unableToDecryptIdTokenAlert: jest.fn() }

      jest.spyOn(useTokenApiModule, 'default').mockReturnValue(tokenApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useTokenService())

      await expect(result.current.getCachedIdTokenMetadata({ refreshCache: false })).rejects.toThrow(mockError)
      expect(tokenApi.getCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: false })
      expect(mockAlerts.unableToDecryptIdTokenAlert).toHaveBeenCalled()
    })

    it('should rethrow error without showing alert if error is not decryption error', async () => {
      const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
      const tokenApi = {
        getCachedIdTokenMetadata: jest.fn().mockRejectedValue(mockError),
      } as any
      const unableToDecryptIdTokenAlert = jest.fn()
      const mockAlerts = { unableToDecryptIdTokenAlert }

      jest.spyOn(useTokenApiModule, 'default').mockReturnValue(tokenApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useTokenService())

      await expect(result.current.getCachedIdTokenMetadata({ refreshCache: false })).rejects.toThrow(mockError)
      expect(tokenApi.getCachedIdTokenMetadata).toHaveBeenCalledWith({ refreshCache: false })
      expect(unableToDecryptIdTokenAlert).not.toHaveBeenCalled()
    })
  })

  it('should return memoized functions', () => {
    const tokenApi = {
      getCachedIdTokenMetadata: jest.fn(),
      checkDeviceCodeStatus: jest.fn(),
      deviceToken: 'test-device-token',
    } as any

    jest.spyOn(useTokenApiModule, 'default').mockReturnValue(tokenApi)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

    const { result, rerender } = renderHook(() => useTokenService())

    const firstResult = result.current

    rerender(undefined)

    const secondResult = result.current

    expect(firstResult).toBe(secondResult)
  })
})
