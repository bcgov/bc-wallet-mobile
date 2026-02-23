import { IdTokenMetadataConfig, TokenApi } from '@/bcsc-theme/api/hooks/useTokens'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * Service layer hook for token api.
 * Business logic related to token API calls and UI event handling should be implemented here.
 *
 * @param tokenApi - The base token API service.
 * @returns Token API service with UI event handling.
 */
export const useTokenService = (tokenApi: TokenApi) => {
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

        throw error
      }
    },
    [alerts, tokenApi]
  )

  return useMemo(
    () => ({
      ...tokenApi, // Spread the base token API to include all its methods
      getCachedIdTokenMetadata,
    }),
    [getCachedIdTokenMetadata, tokenApi]
  )
}
