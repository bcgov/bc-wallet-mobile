import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { getIdTokenMetadata } from '@/bcsc-theme/utils/id-token'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

export interface IdTokenMetadataConfig {
  refreshCache: boolean
}

export interface DeviceTokenPayload {
  client_id: string
  device_code: string
  client_assertion: string
}
export interface TokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

type TokenApi = ReturnType<typeof useTokenApi>

const useTokenApi = (apiClient: BCSCApiClient) => {
  const { updateTokens } = useSecureActions()
  const deviceToken = useCallback(
    async (payload: DeviceTokenPayload) => {
      const { data } = await apiClient.post<TokenResponse>(
        apiClient.endpoints.token,
        {
          device_code: payload.device_code,
          client_id: payload.client_id,
          client_assertion: payload.client_assertion,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        }
      )

      return data
    },
    [apiClient]
  )

  const checkDeviceCodeStatus = useCallback(
    async (deviceCode: string, confirmationCode: string) => {
      return withAccount<TokenResponse>(async (account) => {
        const body = await getDeviceCodeRequestBody(deviceCode, account.clientID, account.issuer, confirmationCode)

        const { data } = await apiClient.post<TokenResponse>(apiClient.endpoints.token, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        })

        try {
          // Pass both refreshToken and accessToken to avoid duplicate API call in updateTokens
          await updateTokens({ refreshToken: data.refresh_token, accessToken: data.access_token })
          apiClient.tokens = data
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          apiClient.logger.error(`[checkDeviceCodeStatus] Failed to update tokens: ${message}`)
          throw error
        }

        return apiClient.tokens
      })
    },
    [apiClient, updateTokens]
  )

  /**
   * Get cached ID token metadata.
   * If refreshCache is true, it will fetch new tokens using the refresh token before extracting metadata.
   *
   * @param {IdTokenMetadataConfig} config - Configuration object.
   * @param {boolean} config.refreshCache - Whether to refresh the token cache.
   * @returns {*} {Promise<IdToken>} The ID token metadata.
   *
   */
  const getCachedIdTokenMetadata = useCallback(
    async (config: IdTokenMetadataConfig) => {
      if (!apiClient.tokens) {
        throw new Error('No tokens available')
      }

      if (config.refreshCache) {
        // Fetch new tokens to ensure we have the latest ID token
        await apiClient.getTokensForRefreshToken(apiClient.tokens.refresh_token)
      }

      return getIdTokenMetadata(apiClient.tokens.id_token, apiClient.logger)
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      checkDeviceCodeStatus,
      deviceToken,
      getCachedIdTokenMetadata,
    }),
    [checkDeviceCodeStatus, getCachedIdTokenMetadata, deviceToken]
  )
}

/**
 * Service hook for token api, business logic related to token API calls and UI event handling should be implemented here.
 *
 * @param tokenApi - The base token API service.
 * @returns Token API service with UI event handling.
 */
export const useTokenService = (tokenApi: TokenApi): ReturnType<typeof useTokenApi> => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

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
      ...tokenApi,
      getCachedIdTokenMetadata,
    }),
    [getCachedIdTokenMetadata, tokenApi]
  )
}

export default useTokenApi
