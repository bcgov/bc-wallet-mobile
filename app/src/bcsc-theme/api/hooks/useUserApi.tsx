import moment from 'moment'
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
   * This value represent the "app expiry date" or "app instance expiration date".
   * This value **is** independent from the physical card expiration date.
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
   * Question: Should we cache this response to avoid multiple network calls?
   *
   * Question: Should we cache this response to avoid multiple network calls?
   *
   * @returns {*} {Promise<UserInfoResponseData>} A promise that resolves to the user information.
   */
  const getUserInfo = useCallback(async (): Promise<UserInfoResponseData> => {
    return withAccount(async () => {
      const { data } = await apiClient.get<string>(apiClient.endpoints.userInfo)
      const userInfoString = await decodePayload(data)
      return JSON.parse(userInfoString)
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

  /**
   * Fetches user metadata and picture URI.
   *
   * @returns {*} {Promise<{ user: UserInfoResponseData; picture?: string }>} An object containing user metadata and optional picture URI.
   */
  const getUserMetadata = useCallback(async () => {
    let pictureUri: string | undefined
    const userMetadata = await getUserInfo()

    // if picture exists, fetch it
    if (userMetadata.picture) {
      pictureUri = await getPicture(userMetadata.picture)
    }

    return { user: userMetadata, picture: pictureUri }
  }, [getPicture, getUserInfo])

  /**
   * Retrieves the account expiration date from user information.
   *
   * @return {*} {Promise<Date>} A promise that resolves to the account expiration date.
   */
  const getAccountExpirationDate = useCallback(async (): Promise<Date> => {
    const userInfo = await getUserInfo()

    return moment(userInfo.card_expiry, 'MMMM D, YYYY').toDate()
  }, [getUserInfo])

  return useMemo(
    () => ({
      getUserInfo,
      getPicture,
      getUserMetadata,
      getAccountExpirationDate,
    }),
    [getUserInfo, getPicture, getUserMetadata, getAccountExpirationDate]
  )
}

export default useUserApi
