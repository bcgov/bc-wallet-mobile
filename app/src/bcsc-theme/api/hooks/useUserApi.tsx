import { AppError, ErrorRegistry } from '@/errors'
import { useCallback, useMemo } from 'react'
import { decodePayload } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
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
  address: { formatted: string }
  picture: string
  card_type: any
  /**
   * Backend team clarification:
   * This value is **NOT** the physical card expiration date.
   * This value represent the "app expiry date" or "app instance expiration date".
   * Workflows that deal with account expiration or renewal should use this value.
   *
   * Note: Backend team might add additional field: `app_expiry`, which would represent the same value.
   */
  card_expiry: string
}

const useUserApi = (apiClient: BCSCApiClient) => {
  /**
   * Get user information in a JWE string and decode.
   *
   * @returns {*} {Promise<UserInfoResponseData>} A promise that resolves to the user information.
   */
  const getUserInfo = useCallback(async (): Promise<UserInfoResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.get<string>(apiClient.endpoints.userInfo)

      let userInfoString: string
      try {
        userInfoString = await decodePayload(data)
      } catch (error) {
        throw AppError.fromErrorDefinition(ErrorRegistry.DECRYPT_JWE_ERROR, { cause: error })
      }

      try {
        return JSON.parse(userInfoString)
      } catch (error) {
        throw AppError.fromErrorDefinition(ErrorRegistry.DESERIALIZE_JSON_ERROR, { cause: error })
      }
    })
  }, [apiClient])

  /**
   * Fetches and converts a user's picture to a base64 URI.
   *
   * @param {string} pictureUrl - The URL of the user's picture.
   * @returns {*} {Promise<string>} A promise that resolves to the base64 URI of the picture.
   */
  const getPicture = useCallback(
    async (pictureUrl: string): Promise<string> => {
      return withAccount(async () => {
        const response = await apiClient.get<ArrayBuffer>(pictureUrl, {
          responseType: 'arraybuffer', // get raw binary data
        })

        // convert to base64
        const base64String = btoa(
          new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )

        // return as uri
        return `data:image/jpeg;base64,${base64String}`
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      getUserInfo,
      getPicture,
    }),
    [getUserInfo, getPicture]
  )
}

export default useUserApi
