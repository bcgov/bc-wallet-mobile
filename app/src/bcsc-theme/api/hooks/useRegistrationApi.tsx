import { getDynamicClientRegistrationBody, setAccount, AccountSecurityMethod, getAccount } from 'react-native-bcsc-core'

import apiClient from '../client'
import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'

export interface RegistrationResponseData {
  client_id: string
  client_id_issued_at: number
  registration_access_token: string
  registration_client_uri: string
  redirect_uris: string[]
  client_name: string
  token_endpoint_auth_method: string
  scope: string
  grant_types: string[]
  response_types: string[]
  jwks: {
    keys: Array<{
      kty: string
      e: string
      kid: string
      alg: string
      n: string
    }>
  }
  request_object_signing_alg: string
  userinfo_signed_response_alg: string
  userinfo_encrypted_response_alg: string
  userinfo_encrypted_response_enc: string
  id_token_signed_response_alg: string
  id_token_encrypted_response_alg: string
  id_token_encrypted_response_enc: string
  token_endpoint_auth_signing_alg: string
  default_max_age: number
  require_auth_time: boolean
  default_acr_values: string[]
}

const useRegistrationApi = () => {
  const register = async () => {
    const account = await getAccount()
    // If an account already exists, we don't need to register again
    if (account) return 
    const { fcmDeviceToken, apnsToken } = await getNotificationTokens()
    const body = await getDynamicClientRegistrationBody(fcmDeviceToken, apnsToken)
    apiClient.logger.info(`Registration body: ${JSON.stringify(JSON.parse(body!), null, 2)}`)
    const { data } = await apiClient.post<RegistrationResponseData>(apiClient.endpoints.registration, body, {
      headers: { 'Content-Type': 'application/json' },
    })
    await setAccount({
      clientID: data.client_id,
      issuer: apiClient.endpoints.issuer,
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    })
    return data
  }

  const updateRegistration = async (clientId: string) => {
    const { fcmDeviceToken, apnsToken } = await getNotificationTokens()
    const body = await getDynamicClientRegistrationBody(fcmDeviceToken, apnsToken)
    const { data } = await apiClient.put<RegistrationResponseData>(
      `${apiClient.endpoints.registration}/${clientId}`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return data
  }

  const deleteRegistration = async (clientId: string) => {
    const { status } = await apiClient.delete(`${apiClient.endpoints.registration}/${clientId}`)
    // 200 level status codes indicate success
    return { success: status > 199 && status < 300 }
  }

  return {
    register,
    updateRegistration,
    deleteRegistration,
  }
}

export default useRegistrationApi
