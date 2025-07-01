import { decodePayload } from 'react-native-bcsc-core'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { jwtDecode } from 'jwt-decode'
export interface UserInfoResponseData {
  identity_assurance_level: string
  credential_reference: string
  sub: string
  transaction_identifier: string
  given_name: string
  family_name: string
  display_name: string
  birthdate: string
  gender: string
  address: { formatted: string }
  picture: string
  card_type: any
  card_expiry: string
}

const useUserApi = () => {
  const getUserInfo = async (): Promise<UserInfoResponseData> => {
    return withAccount(async () => {
      const response = await apiClient.get<any>(apiClient.endpoints.userInfo)
      const userInfoToken = await decodePayload(String(response.data))
      return jwtDecode<UserInfoResponseData>(userInfoToken)
    })
  }

  return {
    getUserInfo,
  }
}

export default useUserApi
