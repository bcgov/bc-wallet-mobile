import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { renderHook } from '@testing-library/react-native'
import { useRegistrationService } from './useRegistrationService'

const newMockAppError = (code: string): AppError => {
  return new AppError('test error', 'This is a test error', {
    appEvent: code as AppEventCode,
    category: ErrorCategory.GENERAL,
    statusCode: 5000,
  })
}

jest.mock('react-native-bcsc-core', () => ({
  BcscNativeErrorCodes: {
    KEYPAIR_GENERATION_FAILED: 'E_KEYPAIR_GENERATION_FAILED',
  },
}))

describe('useRegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should call registration.register and return data', async () => {
      const mockData = { metadata: 'test' }
      const registrationApi = {
        register: jest.fn().mockResolvedValue(mockData),
      } as any
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useRegistrationService(registrationApi))

      const data = await result.current.register('deviceAuth' as any)

      expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
      expect(data).toEqual(mockData)
    })

    it('should show alert on bcsc native error keypair generation failed', async () => {
      const mockError = new Error('test')
      ;(mockError as any).code = 'E_KEYPAIR_GENERATION_FAILED'
      const registrationApi = {
        register: jest.fn().mockRejectedValue(mockError),
      } as any
      const mockAlerts = { problemWithAppAlert: jest.fn() }
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService(registrationApi))

      await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
      expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
      expect(mockAlerts.problemWithAppAlert).toHaveBeenCalled()
    })

    it('should rethrow error without showing alert if error is not decryption error', async () => {
      // const mockError = newMockError('ERR_SOME_OTHER_ERROR')
      // const registrationApi = {
      //   register: jest.fn().mockRejectedValue(mockError),
      // } as any
      // const unableToDecryptIdTokenAlert = jest.fn()
      // const mockAlerts = { unableToDecryptIdTokenAlert }
      // jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)
      //
      // const { result } = renderHook(() => useTokenService(registrationApi))
      //
      // await expect(result.current.register({ refreshCache: false })).rejects.toThrow(mockError)
      // expect(registrationApi.register).toHaveBeenCalledWith({ refreshCache: false })
      // expect(unableToDecryptIdTokenAlert).not.toHaveBeenCalled()
    })
  })
})
