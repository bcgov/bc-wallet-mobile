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

  const getPicture = async (): Promise<string> => {
    return withAccount(async () => {
      const response = await apiClient.get<ArrayBuffer>('https://idsit.gov.bc.ca/device/picture', {
        responseType: 'arraybuffer', // get raw binary data
      })
      
      // convert to base64
      const base64String = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )
      
      // return as uri
      return `data:image/jpeg;base64,${base64String}`
    })
  }

  return {
    getUserInfo,
    getPicture,
  }
}

export default useUserApi
