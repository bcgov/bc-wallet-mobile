import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import apiClient, { TokenStatusResponseDataWithDeviceCount } from '../client'
import { withAccount } from './withAccountGuard'
import { getDeviceCountFromIdToken } from '@/bcsc-theme/utils/get-device-count'

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

const useTokenApi = () => {
  const checkDeviceCodeStatus = async (deviceCode: string, confirmationCode: string) => {
    return withAccount<TokenStatusResponseDataWithDeviceCount>(async (account) => {
      const { clientID, issuer } = account
      const body = await getDeviceCodeRequestBody(deviceCode, clientID, issuer, confirmationCode)
      apiClient.logger.info(`Device code body: ${body}`)
      const { data } = await apiClient.post<TokenStatusResponseData>(apiClient.endpoints.token, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      apiClient.tokens = data

      const bcsc_devices_count = await getDeviceCountFromIdToken(data.id_token, apiClient.logger)
      return { ...data, bcsc_devices_count }
    })
  }

  return {
    checkDeviceCodeStatus,
  }
}

export default useTokenApi
