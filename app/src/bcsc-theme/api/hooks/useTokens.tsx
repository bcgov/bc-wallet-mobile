import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { getIdTokenMetadata } from '@/bcsc-theme/utils/id-token'
import { throwAppError } from '@/bcsc-theme/utils/native-error-map'
import { ErrorRegistry } from '@/errors/errorRegistry'
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

export type TokenApi = ReturnType<typeof useTokenApi>

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
          apiClient.tokens = data
          await updateTokens({ refreshToken: data.refresh_token, accessToken: data.access_token })
        } catch (error) {
          apiClient.logger.error(`[checkDeviceCodeStatus] Failed to update tokens`, error as Error)
          throwAppError(error, ErrorRegistry.STORAGE_WRITE_ERROR)
        }

        return apiClient.tokens!
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
      // Ensure the in-memory token cache is populated, rebuilding it from secure
      // storage if startup hydration left it empty (e.g. a transient network
      // failure during the startup refresh). Only a genuinely missing refresh
      // token throws TOKEN_NULL.
      const cacheWasEmpty = !apiClient.tokens
      let tokens = await apiClient.recoverTokens()

      // A freshly recovered cache already holds newly-fetched tokens, so only pay
      // for an extra refresh when the caller wants the latest and we had a cache.
      if (config.refreshCache && !cacheWasEmpty) {
        // Fetch new tokens to ensure we have the latest ID token
        tokens = await apiClient.getTokensForRefreshToken(tokens.refresh_token)
      }

      const jwk = await apiClient.fetchJwk()
      return getIdTokenMetadata(tokens.id_token, jwk, apiClient.logger)
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

export default useTokenApi
