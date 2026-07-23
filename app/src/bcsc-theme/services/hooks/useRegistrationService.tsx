import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { AppAlerts, useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { AccountSecurityMethod, getAccountSecurityMethod } from 'react-native-bcsc-core'

/**
 * Maps AppEventCodes that can be thrown during registration to their
 * corresponding alert functions from {@link useAlerts}.
 */
const getRegistrationAlertMap = (alerts: AppAlerts): Partial<Record<AppEventCode, (error?: unknown) => void>> => ({
  [AppEventCode.ERR_120_TOJSON_METHOD_FAILURE]: alerts.toJsonMethodFailureAlert,
  [AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE]: alerts.toJsonStringMethodFailureAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR]: alerts.keychainKeyExistsAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR]: alerts.keychainKeyDoesntExistAlert,
  [AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR]: alerts.keychainKeyGenerationAlert,
  [AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR]: alerts.keychainUnavailableAlert,
  [AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR]: alerts.jwtDeviceInfoAlert,
  [AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE]: alerts.clientRegistrationFailureAlert,
  [AppEventCode.ERR_121_REGISTRATION_KEY_NOT_CONFIRMED]: alerts.registrationKeyNotConfirmedAlert,
  // #3419: the unified native mapper replaced the old CLIENT_REGISTRATION_FAILURE fallback with
  // these events for registration-body failures — same generic modal as before.
  [AppEventCode.DCR_BODY_BUILD_FAILED]: alerts.clientRegistrationFailureAlert,
  [AppEventCode.UNMAPPED_NATIVE_ERROR]: alerts.clientRegistrationFailureAlert,
  [AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL]: alerts.clientRegistrationNullAlert,
  [AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON]: alerts.failedToDeserializeJsonAlert,
  [AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON]: alerts.failedToSerializeJsonAlert,
  [AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE]: alerts.failedToRetrieveStringResourceAlert,
  [AppEventCode.ERR_500_INVALID_URL]: alerts.invalidUrlAlert,
  [AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST]: alerts.invalidRegistrationRequestAlert,
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
  const [store] = useStore<BCState>()
  const alerts = useAlerts(navigation)
  const loadingScreen = useLoadingScreen()

  const emitRegistrationAlert = useCallback(
    (error: unknown) => {
      if (isAppError(error)) {
        // Pass the error through so the alert logs it (with its cause) instead of
        // manufacturing a fresh cause-less AppError from the event code alone.
        getRegistrationAlertMap(alerts)[error.appEvent]?.(error)
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
   * @param options - Set `suppressTransientAlerts` for automatic (non user-initiated) callers:
   *   transient keychain-unavailable failures are logged but not surfaced as a modal, since
   *   the operation retries on the next app launch
   * @return Promise resolving to updated registration response data
   */
  const updateRegistration = useCallback(
    async (
      registrationAccessToken: string | undefined,
      selectedNickname: string | undefined,
      options?: { suppressTransientAlerts?: boolean }
    ) => {
      try {
        return await registrationApi.updateRegistration(registrationAccessToken, selectedNickname)
      } catch (error) {
        const isTransient = isAppError(error) && error.appEvent === AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR
        if (!(options?.suppressTransientAlerts && isTransient)) {
          emitRegistrationAlert(error)
        }

        throw error
      }
    },
    [registrationApi, emitRegistrationAlert]
  )

  /**
   * Ensures that the account is registered with the backend.
   * If the account is already registered, it does nothing.
   * If the account is not registered, it registers the account with the backend.
   *
   * @returns Promise resolving when the account is ensured to be registered
   * */
  const ensureRegistered = useCallback(async () => {
    // 1. Check if account is already registered
    if (store.bcscSecure.registrationAccessToken) {
      return
    }

    const stopLoading = loadingScreen.startLoading()
    // 2. Register the account with the backend
    const securityMethod = await getAccountSecurityMethod()

    // Note: Fetches registration access token and updates the account's `clientID`
    await register(securityMethod)
    stopLoading()
  }, [loadingScreen, register, store.bcscSecure.registrationAccessToken])

  return useMemo(
    () => ({
      ...registrationApi, // Spread the base API to include all its methods
      updateRegistration,
      register,
      ensureRegistered,
    }),
    [ensureRegistered, register, registrationApi, updateRegistration]
  )
}
