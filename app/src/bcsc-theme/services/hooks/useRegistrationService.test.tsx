import * as useRegistrationApiModule from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { AppEventCode } from '@/events/appEventCode'
import * as useAlertsModule from '@/hooks/useAlerts'
import { initialState } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import { mockAppError } from '@mocks/helpers/error'
import { renderHook } from '@testing-library/react-native'
import React from 'react'
import { getAccountSecurityMethod } from 'react-native-bcsc-core'
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

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        // The alert must receive the original error so its cause (incl. native
        // keychain diagnostics) reaches the problem-report log
        expect(keychainKeyDoesntExistAlert).toHaveBeenCalledWith(mockError)
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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(clientRegistrationFailureAlert).toHaveBeenCalled()
      })
    })

    // #3419: the unified native mapper replaced the old CLIENT_REGISTRATION_FAILURE fallback with
    // DCR_BODY_BUILD_FAILED / UNMAPPED_NATIVE_ERROR — both must still surface the generic modal.
    describe.each([AppEventCode.DCR_BODY_BUILD_FAILED, AppEventCode.UNMAPPED_NATIVE_ERROR])(
      'App error %s',
      (appEvent) => {
        it('should show clientRegistrationFailureAlert', async () => {
          const mockError = mockAppError(appEvent)
          const registrationApi = {
            register: jest.fn().mockRejectedValue(mockError),
          } as any
          const clientRegistrationFailureAlert = jest.fn()
          const mockAlerts = { clientRegistrationFailureAlert }

          jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
          jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

          const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

          await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
          expect(clientRegistrationFailureAlert).toHaveBeenCalledWith(mockError)
        })
      }
    )

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(failedToSerializeJsonAlert).not.toHaveBeenCalled()
      })
    })

    describe('App error ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE', () => {
      it('should show failedToRetrieveStringResourceAlert on string resource error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const failedToRetrieveStringResourceAlert = jest.fn()
        const mockAlerts = { failedToRetrieveStringResourceAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(failedToRetrieveStringResourceAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_500_INVALID_URL', () => {
      it('should show invalidUrlAlert on invalid URL error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_500_INVALID_URL)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const invalidUrlAlert = jest.fn()
        const mockAlerts = { invalidUrlAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(invalidUrlAlert).toHaveBeenCalled()
      })
    })

    describe('App error ERR_501_INVALID_REGISTRATION_REQUEST', () => {
      it('should show invalidRegistrationRequestAlert on invalid registration request error', async () => {
        const mockError = mockAppError(AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST)
        const registrationApi = {
          register: jest.fn().mockRejectedValue(mockError),
        } as any
        const invalidRegistrationRequestAlert = jest.fn()
        const mockAlerts = { invalidRegistrationRequestAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.register('deviceAuth' as any)).rejects.toThrow(mockError)
        expect(registrationApi.register).toHaveBeenCalledWith('deviceAuth')
        expect(invalidRegistrationRequestAlert).toHaveBeenCalled()
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
      const failedToRetrieveStringResourceAlert = jest.fn()
      const invalidUrlAlert = jest.fn()
      const invalidRegistrationRequestAlert = jest.fn()

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
        failedToRetrieveStringResourceAlert,
        invalidUrlAlert,
        invalidRegistrationRequestAlert,
      }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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
      expect(failedToRetrieveStringResourceAlert).not.toHaveBeenCalled()
      expect(invalidUrlAlert).not.toHaveBeenCalled()
      expect(invalidRegistrationRequestAlert).not.toHaveBeenCalled()
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

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
        // The alert must receive the original error so its cause (incl. native
        // keychain diagnostics) reaches the problem-report log
        expect(keychainKeyDoesntExistAlert).toHaveBeenCalledWith(mockError)
      })
    })

    describe('App error ERR_120_KEYCHAIN_UNAVAILABLE_ERROR', () => {
      const setup = (mockError: unknown) => {
        const registrationApi = {
          updateRegistration: jest.fn().mockRejectedValue(mockError),
        } as any
        const keychainUnavailableAlert = jest.fn()
        const keychainKeyDoesntExistAlert = jest.fn()
        const mockAlerts = { keychainUnavailableAlert, keychainKeyDoesntExistAlert }

        jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
        jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

        return { keychainUnavailableAlert, keychainKeyDoesntExistAlert }
      }

      it('should show keychainUnavailableAlert by default', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR)
        const { keychainUnavailableAlert } = setup(mockError)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
        expect(keychainUnavailableAlert).toHaveBeenCalledWith(mockError)
      })

      it('should suppress the alert but rethrow when suppressTransientAlerts is set', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR)
        const { keychainUnavailableAlert } = setup(mockError)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(
          result.current.updateRegistration('someToken', 'someNickname', { suppressTransientAlerts: true })
        ).rejects.toThrow(mockError)
        expect(keychainUnavailableAlert).not.toHaveBeenCalled()
      })

      it('should still alert on non-transient errors when suppressTransientAlerts is set', async () => {
        const mockError = mockAppError(AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR)
        const { keychainKeyDoesntExistAlert } = setup(mockError)

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

        await expect(
          result.current.updateRegistration('someToken', 'someNickname', { suppressTransientAlerts: true })
        ).rejects.toThrow(mockError)
        expect(keychainKeyDoesntExistAlert).toHaveBeenCalledWith(mockError)
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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

        const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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
      const failedToRetrieveStringResourceAlert = jest.fn()
      const invalidUrlAlert = jest.fn()
      const invalidRegistrationRequestAlert = jest.fn()
      const mockAlerts = {
        toJsonMethodFailureAlert,
        toJsonStringMethodFailureAlert,
        keychainKeyExistsAlert,
        keychainKeyDoesntExistAlert,
        keychainKeyGenerationAlert,
        jwtDeviceInfoAlert,
        clientRegistrationFailureAlert,
        clientRegistrationNullAlert,
        failedToRetrieveStringResourceAlert,
        invalidUrlAlert,
        invalidRegistrationRequestAlert,
      }

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue(mockAlerts as any)

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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
      expect(failedToRetrieveStringResourceAlert).not.toHaveBeenCalled()
      expect(invalidUrlAlert).not.toHaveBeenCalled()
      expect(invalidRegistrationRequestAlert).not.toHaveBeenCalled()
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

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

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

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

      await expect(result.current.updateRegistration('someToken', 'someNickname')).rejects.toThrow(mockError)
      expect(registrationApi.updateRegistration).toHaveBeenCalledWith('someToken', 'someNickname')
      expect(failedToDeserializeJsonAlert).toHaveBeenCalled()
    })
  })

  describe('ensureRegistered', () => {
    it('should skip registration when a registration access token already exists', async () => {
      const registrationApi = {
        register: jest.fn(),
      } as any

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const wrapper = ({ children }: React.PropsWithChildren) => (
        <BasicAppContext
          initialStateOverride={{
            bcscSecure: { ...initialState.bcscSecure, registrationAccessToken: 'existing-token' },
          }}
        >
          {children}
        </BasicAppContext>
      )

      const { result } = renderHook(() => useRegistrationService(), { wrapper })

      await result.current.ensureRegistered()

      expect(getAccountSecurityMethod).not.toHaveBeenCalled()
      expect(registrationApi.register).not.toHaveBeenCalled()
    })

    it('should register with the current security method when no token exists', async () => {
      const mockSecurityMethod = 'app_pin_no_device_authn'
      jest.mocked(getAccountSecurityMethod).mockResolvedValue(mockSecurityMethod as any)

      const registrationApi = {
        register: jest.fn().mockResolvedValue({ client_id: 'new-client-id' }),
      } as any

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

      await result.current.ensureRegistered()

      expect(getAccountSecurityMethod).toHaveBeenCalled()
      expect(registrationApi.register).toHaveBeenCalledWith(mockSecurityMethod)
    })

    it('should propagate registration failures and emit the mapped alert', async () => {
      const mockError = mockAppError(AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE)
      jest.mocked(getAccountSecurityMethod).mockResolvedValue('app_pin_no_device_authn' as any)

      const registrationApi = {
        register: jest.fn().mockRejectedValue(mockError),
      } as any
      const clientRegistrationFailureAlert = jest.fn()

      jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
      jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({ clientRegistrationFailureAlert } as any)

      const { result } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })

      // Rejection must propagate so callers (e.g. useDataLoader) can route it to onError
      await expect(result.current.ensureRegistered()).rejects.toThrow(mockError)
      expect(clientRegistrationFailureAlert).toHaveBeenCalledWith(mockError)
    })
  })

  it('should return memoized functions', () => {
    const registrationApi = {
      register: jest.fn(),
      updateRegistration: jest.fn(),
    } as any

    jest.spyOn(useRegistrationApiModule, 'default').mockReturnValue(registrationApi)
    jest.spyOn(useAlertsModule, 'useAlerts').mockReturnValue({} as any)

    const { result, rerender } = renderHook(() => useRegistrationService(), { wrapper: BasicAppContext })
    const firstRegister = result.current.register
    const firstUpdateRegistration = result.current.updateRegistration
    const firstEnsureRegistered = result.current.ensureRegistered

    rerender(undefined)

    expect(result.current.register).toBe(firstRegister)
    expect(result.current.updateRegistration).toBe(firstUpdateRegistration)
    expect(result.current.ensureRegistered).toBe(firstEnsureRegistered)
  })
})
