import { getAccount, getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'

export interface TokenStatusResponseData {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

const useTokenApi = () => {
  const checkDeviceCodeStatus = async (deviceCode: string, confirmationCode: string) => {
    return withAccount<TokenStatusResponseData>(async (account) => {
      const { clientID, issuer } = account
      const body = await getDeviceCodeRequestBody(deviceCode, clientID, issuer, confirmationCode)
      apiClient.logger.info(`Device code body: ${body}`)
      const { data } = await apiClient.post<TokenStatusResponseData>(apiClient.endpoints.token, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      apiClient.tokens = data
      return data
    })
  }

  return {
    checkDeviceCodeStatus,
  }
}

export default useTokenApi
