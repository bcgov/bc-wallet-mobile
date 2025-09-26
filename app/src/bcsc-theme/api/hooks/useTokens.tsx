import { getDeviceCountFromIdToken } from '@/bcsc-theme/utils/get-device-count'
import { useCallback, useMemo } from 'react'
import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import BCSCApiClient, { TokenStatusResponseDataWithDeviceCount } from '../client'
import { VerifyAttestation } from './useDeviceAttestationApi'
import { withAccount } from './withAccountGuard'

export interface TokenStatusResponseData {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

export interface BcscJwtPayload {
  bcsc_devices_count?: number
  // Add other BCSC-specific claims here as needed
}

const useTokenApi = (apiClient: BCSCApiClient) => {
  const deviceToken = useCallback(
    async (payload: VerifyAttestation) => {
      const { data } = await apiClient.post<TokenStatusResponseData>(
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
      return withAccount<TokenStatusResponseDataWithDeviceCount>(async (account) => {
        const { clientID, issuer } = account
        const body = await getDeviceCodeRequestBody(deviceCode, clientID, issuer, confirmationCode)
        const { data } = await apiClient.post<TokenStatusResponseData>(apiClient.endpoints.token, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        })
        apiClient.tokens = data

        const bcsc_devices_count = await getDeviceCountFromIdToken(data.id_token, apiClient.logger)
        return { ...data, bcsc_devices_count }
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      checkDeviceCodeStatus,
      deviceToken,
    }),
    [checkDeviceCodeStatus]
  )
}

export default useTokenApi
