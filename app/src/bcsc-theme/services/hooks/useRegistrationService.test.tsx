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

    describe('App error ERR_120_KEYCHAIN_KEY_GENERATION_ERROR', () => {
      it('should show keychainKeyGenerationAlert on keypair generation error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyGenerationAlert = jest.fn()
        const mockAlerts = { keychainKeyGenerationAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(keychainKeyGenerationAlert).toHaveBeenCalled()
      })

      it('should rethrow error without showing alert if error is not keychain key generation error', async () => {
        const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyGenerationAlert = jest.fn()
        const mockAlerts = { keychainKeyGenerationAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(keychainKeyGenerationAlert).not.toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_TOJSON_METHOD_FAILURE', () => {
      it('should show toJsonMethodFailureAlert on toJSON serialization error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_TOJSON_METHOD_FAILURE)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const toJsonMethodFailureAlert = jest.fn()
        const mockAlerts = { toJsonMethodFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(toJsonMethodFailureAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_TOJSONSTRING_METHOD_FAILURE', () => {
      it('should show toJsonStringMethodFailureAlert on toJSONString serialization error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const toJsonStringMethodFailureAlert = jest.fn()
        const mockAlerts = { toJsonStringMethodFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(toJsonStringMethodFailureAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_KEYCHAIN_KEY_EXISTS_ERROR', () => {
      it('should show keychainKeyExistsAlert on keychain key exists error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyExistsAlert = jest.fn()
        const mockAlerts = { keychainKeyExistsAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(keychainKeyExistsAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR', () => {
      it('should show keychainKeyDoesntExistAlert on keychain key not found error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyDoesntExistAlert = jest.fn()
        const mockAlerts = { keychainKeyDoesntExistAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(keychainKeyDoesntExistAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_JWT_DEVICE_INFO_ERROR', () => {
      it('should show jwtDeviceInfoAlert on JWT device info error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const jwtDeviceInfoAlert = jest.fn()
        const mockAlerts = { jwtDeviceInfoAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(jwtDeviceInfoAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_CLIENT_REGISTRATION_FAILURE', () => {
      it('should show clientRegistrationFailureAlert on client registration failure', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const clientRegistrationFailureAlert = jest.fn()
        const mockAlerts = { clientRegistrationFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(clientRegistrationFailureAlert).toHaveBeenCalled()
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

    describe('App error ERR_115_FAILED_TO_SERIALIZE_JSON', () => {
      it('should show the alert for the app error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const failedToSerializeJsonAlert = jest.fn()
        const mockAlerts = { failedToSerializeJsonAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(failedToSerializeJsonAlert).toHaveBeenCalled()
      })

      it('should rethrow error without showing alert if error is not serialize json error', async () => {
        const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const failedToSerializeJsonAlert = jest.fn()
        const mockAlerts = { failedToSerializeJsonAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(failedToSerializeJsonAlert).not.toHaveBeenCalled()
      })
    })

    it('should rethrow error without showing alert if error is not bcsc native error or client registration null app error', async () => {
      const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
      const registrationApi = {
        register: jest.fn().mockRejectedValue(mockError),
      } as any
      const toJsonMethodFailureAlert = jest.fn()
      const toJsonStringMethodFailureAlert = jest.fn()
      const keychainKeyExistsAlert = jest.fn()
      const keychainKeyDoesntExistAlert = jest.fn()
      const keychainKeyGenerationAlert = jest.fn()
      const jwtDeviceInfoAlert = jest.fn()
      const clientRegistrationFailureAlert = jest.fn()
      const clientRegistrationNullAlert = jest.fn()
      const failedToSerializeJsonAlert = jest.fn()

      const mockAlerts = {
        toJsonMethodFailureAlert,
        toJsonStringMethodFailureAlert,
        keychainKeyExistsAlert,
        keychainKeyDoesntExistAlert,
        keychainKeyGenerationAlert,
        jwtDeviceInfoAlert,
        clientRegistrationFailureAlert,
        clientRegistrationNullAlert,
        failedToSerializeJsonAlert,
      }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
      expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
      expect(toJsonMethodFailureAlert).not.toHaveBeenCalled()
      expect(toJsonStringMethodFailureAlert).not.toHaveBeenCalled()
      expect(keychainKeyExistsAlert).not.toHaveBeenCalled()
      expect(keychainKeyDoesntExistAlert).not.toHaveBeenCalled()
      expect(keychainKeyGenerationAlert).not.toHaveBeenCalled()
      expect(jwtDeviceInfoAlert).not.toHaveBeenCalled()
      expect(clientRegistrationFailureAlert).not.toHaveBeenCalled()
      expect(clientRegistrationNullAlert).not.toHaveBeenCalled()
      expect(failedToSerializeJsonAlert).not.toHaveBeenCalled()
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

    describe('App error ERR_120_KEYCHAIN_KEY_GENERATION_ERROR', () => {
      it('should show keychainKeyGenerationAlert on keypair generation error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyGenerationAlert = jest.fn()
        const mockAlerts = { keychainKeyGenerationAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(keychainKeyGenerationAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_TOJSON_METHOD_FAILURE', () => {
      it('should show toJsonMethodFailureAlert on toJSON serialization error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_TOJSON_METHOD_FAILURE)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const toJsonMethodFailureAlert = jest.fn()
        const mockAlerts = { toJsonMethodFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(toJsonMethodFailureAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_TOJSONSTRING_METHOD_FAILURE', () => {
      it('should show toJsonStringMethodFailureAlert on toJSONString serialization error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const toJsonStringMethodFailureAlert = jest.fn()
        const mockAlerts = { toJsonStringMethodFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(toJsonStringMethodFailureAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_KEYCHAIN_KEY_EXISTS_ERROR', () => {
      it('should show keychainKeyExistsAlert on keychain key exists error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyExistsAlert = jest.fn()
        const mockAlerts = { keychainKeyExistsAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(keychainKeyExistsAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR', () => {
      it('should show keychainKeyDoesntExistAlert on keychain key not found error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainKeyDoesntExistAlert = jest.fn()
        const mockAlerts = { keychainKeyDoesntExistAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(keychainKeyDoesntExistAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_JWT_DEVICE_INFO_ERROR', () => {
      it('should show jwtDeviceInfoAlert on JWT device info error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const jwtDeviceInfoAlert = jest.fn()
        const mockAlerts = { jwtDeviceInfoAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(jwtDeviceInfoAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_120_CLIENT_REGISTRATION_FAILURE', () => {
      it('should show clientRegistrationFailureAlert on client registration failure', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE)
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const clientRegistrationFailureAlert = jest.fn()
        const mockAlerts = { clientRegistrationFailureAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService())

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        expect(clientRegistrationFailureAlert).toHaveBeenCalled()
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

    it('should rethrow error without showing alert if error is not a handled app error', async () => {
      const mockError = mockAppError('ERR_SOME_OTHER_ERROR')
      const registrationApi = {
        updateRegistration: jest.fn().mockRejectedValue(mockError),
      } as any
      const toJsonMethodFailureAlert = jest.fn()
      const toJsonStringMethodFailureAlert = jest.fn()
      const keychainKeyExistsAlert = jest.fn()
      const keychainKeyDoesntExistAlert = jest.fn()
      const keychainKeyGenerationAlert = jest.fn()
      const jwtDeviceInfoAlert = jest.fn()
      const clientRegistrationFailureAlert = jest.fn()
      const clientRegistrationNullAlert = jest.fn()
      const mockAlerts = {
        toJsonMethodFailureAlert,
        toJsonStringMethodFailureAlert,
        keychainKeyExistsAlert,
        keychainKeyDoesntExistAlert,
        keychainKeyGenerationAlert,
        jwtDeviceInfoAlert,
        clientRegistrationFailureAlert,
        clientRegistrationNullAlert,
      }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(toJsonMethodFailureAlert).not.toHaveBeenCalled()
      expect(toJsonStringMethodFailureAlert).not.toHaveBeenCalled()
      expect(keychainKeyExistsAlert).not.toHaveBeenCalled()
      expect(keychainKeyDoesntExistAlert).not.toHaveBeenCalled()
      expect(keychainKeyGenerationAlert).not.toHaveBeenCalled()
      expect(jwtDeviceInfoAlert).not.toHaveBeenCalled()
      expect(clientRegistrationFailureAlert).not.toHaveBeenCalled()
      expect(clientRegistrationNullAlert).not.toHaveBeenCalled()
    })
  })

  describe('App error ERR_115_FAILED_TO_SERIALIZE_JSON (updateRegistration)', () => {
    it('should show the alert for the app error', async () => {
      const mockError = mockAppError(AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON)
      const registrationApi = {
        updateRegistration: jest.fn().mockRejectedValue(mockError),
      } as any
      const failedToSerializeJsonAlert = jest.fn()
      const mockAlerts = { failedToSerializeJsonAlert }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService())

      await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(failedToSerializeJsonAlert).toHaveBeenCalled()
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
