import apiClient from '../client'
import { withAccount } from './withAccountGuard'

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
  address: string
  picture: string
  card_type: any
  card_expiry: string
}

const useUserApi = () => {
  const getUserInfo = async (): Promise<UserInfoResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.get<UserInfoResponseData>(apiClient.endpoints.userInfo)
      return data
    })
  }

  return {
    getUserInfo,
  }
}

export default useUserApi
