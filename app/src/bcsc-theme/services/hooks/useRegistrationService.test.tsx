import * as useRegistrationApiModule from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import { useRegistrationService } from './useRegistrationService'

jest.mock('react-native-bcsc-core')

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

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useRegistrationService())

      const data = await result.current.register('deviceAuth' as any)

      expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
      expect(data).toEqual(mockData)
    })

    describe('native error E_KEYPAIR_GENERATION_FAILED', () => {
      it('should show alert on bcsc native error keypair generation failed', async () => {
        const mockError = new Error('test')
        ;(mockError as any).code = 'E_KEYPAIR_GENERATION_FAILED'
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const mockAlerts = { problemWithAppAlert: jest.fn() }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(mockAlerts.problemWithAppAlert).toHaveBeenCalled()
      })

      it('should rethrow error without showing alert if error is not keypair generation failed error', async () => {
        const mockError = new Error('test')
        ;(mockError as any).code = 'E_SOME_OTHER_ERROR'
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const problemWithAppAlert = jest.fn()
        const mockAlerts = { problemWithAppAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(problemWithAppAlert).not.toHaveBeenCalled()
      })
    })

    describe('App error ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL', () => {
      it('should show the alert for the app error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const clientRegistrationNullAlert = jest.fn()
        const mockAlerts = { clientRegistrationNullAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(clientRegistrationNullAlert).toHaveBeenCalled()
      })

      it('should rethrow error without showing alert if error is not client registration null error', async () => {
        const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const clientRegistrationNullAlert = jest.fn()
        const mockAlerts = { clientRegistrationNullAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(clientRegistrationNullAlert).not.toHaveBeenCalled()
      })
    })

    it('should rethrow error without showing alert if error is not bcsc native error or client registration null app error', async () => {
      const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
      const registrationApi = {
        register: jest.fn().mockRejectedValue(mockError),
      } as any
      const problemWithAppAlert = jest.fn()
      const clientRegistrationNullAlert = jest.fn()
      const mockAlerts = { problemWithAppAlert, clientRegistrationNullAlert }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
      expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
      expect(problemWithAppAlert).not.toHaveBeenCalled()
      expect(clientRegistrationNullAlert).not.toHaveBeenCalled()
    })
  })

  describe('updateRegistration', () => {
    it('should call registration.updateRegistration and return data', async () => {
      const mockData = { metadata: 'test' }
      const registrationApi = {
        updateRegistration: jest.fn().mockResolvedValue(mockData),
      } as any

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useRegistrationService())

      const data = await result.current.updateRegistration('someToken', 'someNickname')

      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(data).toEqual(mockData)
    })

    describe('native error E_KEYPAIR_GENERATION_FAILED', () => {
      it('should show alert on bcsc native error keypair generation failed', async () => {
        const mockError = new Error('test')
        ;(mockError as any).code = 'E_KEYPAIR_GENERATION_FAILED'
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const mockAlerts = { problemWithAppAlert: jest.fn() }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(mockAlerts.problemWithAppAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL', () => {
      it('should show the alert for the app error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const clientRegistrationNullAlert = jest.fn()
        const mockAlerts = { clientRegistrationNullAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(clientRegistrationNullAlert).toHaveBeenCalled()
      })
    })

    it('should rethrow error without showing alert if error is not bcsc native error or client registration null app error', async () => {
      const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
      const registrationApi = {
        updateRegistration: jest.fn().mockRejectedValue(mockError),
      } as any
      const problemWithAppAlert = jest.fn()
      const clientRegistrationNullAlert = jest.fn()
      const mockAlerts = { problemWithAppAlert, clientRegistrationNullAlert }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(problemWithAppAlert).not.toHaveBeenCalled()
      expect(clientRegistrationNullAlert).not.toHaveBeenCalled()
    })
  })

  describe('App error ERR_109_FAILED_TO_DESERIALIZE_JSON', () => {
    it('should show the alert for the app error', async () => {
      const mockError = mockAppError(AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)
      const registrationApi = {
        updateRegistration: jest.fn().mockRejectedValue(mockError),
      } as any
      const failedToDeserializeJsonAlert = jest.fn()
      const mockAlerts = { failedToDeserializeJsonAlert }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(failedToDeserializeJsonAlert).toHaveBeenCalled()
    })
  })

  it('should return memoized functions', () => {
    const registrationApi = {
      register: jest.fn(),
      updateRegistration: jest.fn(),
    } as any

    jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

    const { result, rerender } = renderHook(() => useRegistrationService())
    const firstRegister = result.current.register
    const firstUpdateRegistration = result.current.updateRegistration

    rerender(undefined)

    expect(result.current.register).toBe(firstRegister)
    expect(result.current.updateRegistration).toBe(firstUpdateRegistration)
  })
})
