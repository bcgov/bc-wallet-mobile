import { getAccount } from 'react-native-bcsc-core'
import apiClient from '../client'

export interface VerifyInPersonResponseData {
  device_code: string
  user_code: string
  verified_email: string
  expires_in: number
}

const useAuthorizationApi = () => {
  const verifyInPerson = async (serial: string, birthdate: Date) => {
    const account = await getAccount()
    if (!account) {
      throw new Error('No account found. Please register first.')
    }
    const body = {
      response_type: 'device_code',
      client_id: account.clientID,
      card_serial_number: serial,
      birth_date: birthdate.toISOString().split('T')[0],
      scope: 'openid profile address offline_access'
    }
    apiClient.logger.info(`Registration body: ${JSON.stringify(body, null, 2)}`)
    const { data } = await apiClient.post<VerifyInPersonResponseData>(apiClient.endpoints.deviceAuthorization, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  }

  return {
    verifyInPerson
  }
}

export default useAuthorizationApi
