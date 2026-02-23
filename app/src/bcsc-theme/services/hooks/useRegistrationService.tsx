import { RegistrationApi } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { AccountSecurityMethod, BcscNativeErrorCodes, isBcscNativeError } from 'react-native-bcsc-core'

/**
 * Service layer hook for registration api.
 * Business logic related to registration API calls and UI event handling should be implemented here.
 *
 * @param registrationApi - The base token API service.
 * @returns Registration service
 */
export const useRegistrationService = (registrationApi: RegistrationApi) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

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
        if (isBcscNativeError(error) && error.code === BcscNativeErrorCodes.KEYPAIR_GENERATION_FAILED) {
          alerts.problemWithAppAlert()
        }

        if (isAppError(error, AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)) {
          alerts.clientRegistrationNullAlert()
        }

        throw error
      }
    },
    [registrationApi, alerts]
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
        if (isBcscNativeError(error) && error.code === BcscNativeErrorCodes.KEYPAIR_GENERATION_FAILED) {
          alerts.problemWithAppAlert()
        }

        if (isAppError(error, AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)) {
          alerts.clientRegistrationNullAlert()
        }

        throw error
      }
    },
    [registrationApi, alerts]
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
