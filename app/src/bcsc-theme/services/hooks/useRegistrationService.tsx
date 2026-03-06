import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { AppAlerts, useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { AccountSecurityMethod } from 'react-native-bcsc-core'

/**
 * Maps AppEventCodes that can be thrown during registration to their
 * corresponding alert functions from {@link useAlerts}.
 */
const getRegistrationAlertMap = (alerts: AppAlerts): Partial<Record<AppEventCode, () => void>> => ({
  [AppEventCode.ERR_120_TOJSON_METHOD_FAILURE]: alerts.toJsonMethodFailureAlert,
  [AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE]: alerts.toJsonStringMethodFailureAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR]: alerts.keychainKeyExistsAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR]: alerts.keychainKeyDoesntExistAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR]: alerts.keychainKeyGenerationAlert,
  [AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR]: alerts.jwtDeviceInfoAlert,
  [AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE]: alerts.clientRegistrationFailureAlert,
  [AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL]: alerts.clientRegistrationNullAlert,
  [AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON]: alerts.failedToDeserializeJsonAlert,
  [AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON]: alerts.failedToSerializeJsonAlert,
})

/**
 * Service layer hook for registration api.
 * Business logic related to registration API calls and UI event handling should be implemented here.
 *
 * @returns Registration service
 */
export const useRegistrationService = () => {
  const { client, isClientReady } = useBCSCApiClientState()
  const registrationApi = useRegistrationApi(client, isClientReady)
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  const emitRegistrationAlert = useCallback(
    (error: unknown) => {
      if (isAppError(error)) {
        getRegistrationAlertMap(alerts)[error.appEvent]?.()
      }
    },
    [alerts]
  )

  /**
   * Registers a new BCSC client and alerts on failures during the registration process.
   *
   * @param securityMethod - The account security method to use for registration
   * @returns Promise resolving to registration response data or void if account exists
   */
  const register = useCallback(
    async (securityMethod: AccountSecurityMethod) => {
      try {
        return await registrationApi.register(securityMethod)
      } catch (error) {
        emitRegistrationAlert(error)

        throw error
      }
    },
    [registrationApi, emitRegistrationAlert]
  )

  /**
   * Updates an existing BCSC client registration and alerts on failures during the update process.
   *
   * @param registrationAccessToken - Bearer token for registration endpoint access
   * @param selectedNickname - New client name/nickname to set
   * @return Promise resolving to updated registration response data
   */
  const updateRegistration = useCallback(
    async (registrationAccessToken: string | undefined, selectedNickname: string | undefined) => {
      try {
        return await registrationApi.updateRegistration(registrationAccessToken, selectedNickname)
      } catch (error) {
        emitRegistrationAlert(error)

        throw error
      }
    },
    [registrationApi, emitRegistrationAlert]
  )

  return useMemo(
    () => ({
      ...registrationApi, // Spread the base API to include all its methods
      updateRegistration,
      register,
    }),
    [register, registrationApi, updateRegistration]
  )
}
