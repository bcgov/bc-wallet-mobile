import BCSCApiClient from '@/bcsc-theme/api/client'
import useTokenApi, { IdTokenMetadataConfig } from '@/bcsc-theme/api/hooks/useTokens'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * Service layer hook for token api.
 * Business logic related to token API calls and UI event handling should be implemented here.
 *
 * @returns Token API service with UI event handling.
 */
export const useTokenService = () => {
  const { client } = useBCSCApiClientState()
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  /**
   * Gets cached ID token metadata and handles errors related to decryption and verification failures by showing an alert.
   *
   * @param config - Configuration for fetching ID token metadata
   * @returns Promise resolving to ID token metadata response data
   */
  const getCachedIdTokenMetadata = useCallback(
    async (config: IdTokenMetadataConfig) => {
      try {
        return await tokenApi.getCachedIdTokenMetadata(config)
      } catch (error) {
        if (isAppError(error, AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN)) {
          alerts.unableToDecryptIdTokenAlert()
        }

        if (isAppError(error, AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)) {
          alerts.failedToDeserializeJsonAlert()
        }

        if (isAppError(error, AppEventCode.ERR_114_FAILED_TO_GET_CLAIMS_SET_AFTER_DECRYPT_AND_VERIFY)) {
          alerts.failedToGetClaimsSetAlert()
        }

        if (isAppError(error, AppEventCode.ERR_117_FAILED_TO_PARSE_JWS)) {
          alerts.failedToParseJwsAlert()
        }

        if (isAppError(error, AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL)) {
          alerts.tokenUnexpectedlyNullAlert()
        }

        throw error
      }
    },
    [alerts, tokenApi]
  )

  /**
   * Checks the verification status of a device code and confirmation code.
   *
   * @see {@link tokenApi.checkDeviceCodeStatus} for the underlying API call and error handling logic.
   *
   * @param deviceCode - The device code to check
   * @param confirmationCode - The confirmation code to check
   * @return Promise resolving to true if verified, false if pending, or throws an error for other issues
   */
  const checkVerificationStatus = useCallback(
    async (deviceCode: string, confirmationCode: string) => {
      try {
        await tokenApi.checkDeviceCodeStatus(deviceCode, confirmationCode)
        return true
      } catch (error) {
        if (isAppError(error, AppEventCode.AUTHORIZATION_PENDING)) {
          return false
        }

        throw error
      }
    },
    [tokenApi]
  )

  return useMemo(
    () => ({
      ...tokenApi, // Spread the base token API to include all its methods
      getCachedIdTokenMetadata,
      checkVerificationStatus,
    }),
    [checkVerificationStatus, getCachedIdTokenMetadata, tokenApi]
  )
}
