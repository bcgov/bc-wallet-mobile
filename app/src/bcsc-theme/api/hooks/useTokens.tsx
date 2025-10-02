import { useCallback, useMemo } from 'react'
import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'
import { getIdTokenMetadata } from '@/bcsc-theme/utils/bcsc-account'
import { BCSCCardType } from '@/bcsc-theme/types/cards'

export interface TokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

const useTokenApi = (apiClient: BCSCApiClient) => {
  const checkDeviceCodeStatus = useCallback(
    async (deviceCode: string, confirmationCode: string) => {
      return withAccount<TokenResponse>(async (account) => {
        const body = await getDeviceCodeRequestBody(deviceCode, account.clientID, account.issuer, confirmationCode)

        const { data } = await apiClient.post<TokenResponse>(apiClient.endpoints.token, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        })

        apiClient.tokens = data

        return apiClient.tokens
      })
    },
    [apiClient]
  )

  /**
   * Get the type of BCSC card associated with the ID token.
   * This value does not change after the initial authentication, so it does not require a token refresh.
   *
   * Note: Returns BCSCCardType.None if there are no tokens available.
   *
   * @returns {*} {Promise<BCSCCardType>} The type of BCSC card.
   */
  const getCardType = useCallback(async () => {
    if (!apiClient.tokens) {
      return BCSCCardType.None
    }

    const tokenMetadata = await getIdTokenMetadata(apiClient.tokens.id_token, apiClient.logger)

    return tokenMetadata.bcsc_card_type
  }, [apiClient.logger, apiClient.tokens])

  /**
   * Get the count of devices associated with the account from the ID token.
   * This will always fetch a new token using the refresh token to ensure the device count is current.
   *
   * Note: Returns null if there are no tokens available or if the device count is not present in the token.
   *
   * @returns {*} {Promise<number | null>} The count of devices or null.
   */
  const getDeviceCount = useCallback(async () => {
    if (!apiClient.tokens) {
      return null
    }

    // Fetch new tokens to ensure we have the latest device count
    const tokens = await apiClient.getTokensForRefreshToken(apiClient.tokens.refresh_token)

    const tokenMetadata = await getIdTokenMetadata(tokens.id_token, apiClient.logger)

    return tokenMetadata.bcsc_devices_count ?? null
  }, [apiClient])

  return useMemo(
    () => ({
      checkDeviceCodeStatus,
      getCardType,
      getDeviceCount,
    }),
    [checkDeviceCodeStatus, getCardType, getDeviceCount]
  )
}

export default useTokenApi
