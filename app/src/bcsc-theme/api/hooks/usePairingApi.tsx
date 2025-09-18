import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { useCallback, useMemo } from 'react'
import { signPairingCode } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

export interface PairingCodeLoginClientMetadata {
  transaction_id: string
  client_ref_id: string
  client_name: string
  client_uri: string
  initiate_login_uri: string
  policy_uri: string
  application_type: string
  useage_date: string
}

const usePairingApi = (apiClient: BCSCApiClient) => {
  /**
   * Logs in a user using a pairing code and returns the client metadata.
   *
   * @param {string} code - The pairing code to use for login.
   * @returns {*} {Promise<PairingCodeLoginClientMetadata>} A promise that resolves to the client metadata.
   */
  const loginByPairingCode = useCallback(
    async (code: string) => {
      return withAccount<PairingCodeLoginClientMetadata>(async (account) => {
        const { issuer, clientID } = account
        const { fcmDeviceToken, apnsToken } = await getNotificationTokens()
        const signedCode = await signPairingCode(code, issuer, clientID, fcmDeviceToken, apnsToken)
        const response = await apiClient.post<PairingCodeLoginClientMetadata>(
          // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
          `${apiClient.baseURL}/cardtap/v3/mobile/assertion`,
          { assertion: signedCode },
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        return response.data
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      loginByPairingCode,
    }),
    [loginByPairingCode]
  )
}

export default usePairingApi
