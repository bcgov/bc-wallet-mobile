import { useCallback, useMemo } from 'react'
import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'
import { BCSCAccountJWT, getBCSCAccountJWT } from '@/bcsc-theme/utils/bcsc-account-jwt'

export interface TokenStatusResponseData {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

export interface TokenStatusWithAccount extends TokenStatusResponseData {
  account: BCSCAccountJWT
}

export interface TokenStatusResponseDataWithDeviceCount extends TokenStatusResponseData {
  bcsc_devices_count?: number
}

const useTokenApi = (apiClient: BCSCApiClient) => {
  const checkDeviceCodeStatus = useCallback(
    async (deviceCode: string, confirmationCode: string) => {
      return withAccount<TokenStatusResponseDataWithDeviceCount>(async (account) => {
        const body = await getDeviceCodeRequestBody(deviceCode, account.clientID, account.issuer, confirmationCode)

        const { data } = await apiClient.post<TokenStatusResponseData>(apiClient.endpoints.token, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        })

        const accountJwt = await getBCSCAccountJWT(data.id_token, apiClient.logger)

        apiClient.tokens = { ...data, account: accountJwt }

        return { ...data, bcsc_devices_count: accountJwt.bcsc_devices_count }
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      checkDeviceCodeStatus,
    }),
    [checkDeviceCodeStatus]
  )
}

export default useTokenApi
