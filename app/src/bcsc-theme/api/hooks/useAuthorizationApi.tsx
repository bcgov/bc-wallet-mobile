import apiClient from '../client'
import { withAccount } from './withAccountGuard'

export interface VerifyInPersonResponseData {
  device_code: string
  user_code: string
  verified_email: string
  expires_in: number
}

const useAuthorizationApi = () => {
  // TODO: fetch evidence API endpoint from this endpoint
  const authorizeDevice = async (serial: string, birthdate: Date): Promise<VerifyInPersonResponseData> => {
    return withAccount<VerifyInPersonResponseData>(async (account) => {
      const body = {
        response_type: 'device_code',
        client_id: account.clientID,
        card_serial_number: serial,
        birth_date: birthdate.toISOString().split('T')[0],
        scope: 'openid profile address offline_access',
      }
      apiClient.logger.info(`Registration body: ${JSON.stringify(body, null, 2)}`)
      const { data } = await apiClient.post<VerifyInPersonResponseData>(apiClient.endpoints.deviceAuthorization, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return data
    })
  }

  return {
    authorizeDevice,
  }
}

export default useAuthorizationApi
