import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { TOKENS, useServices } from '@bifold/core'
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
  usage_date: string
}

const usePairingApi = (apiClient: BCSCApiClient) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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
        const { fcmDeviceToken, deviceToken } = await getNotificationTokens(logger)
        const signedCode = await signPairingCode(code, issuer, clientID, fcmDeviceToken, deviceToken)
        const response = await apiClient.post<PairingCodeLoginClientMetadata>(
          `${apiClient.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`,
          { assertion: signedCode },
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        return response.data
      })
    },
    [apiClient, logger]
  )

  /**
   * Forgets all device pairings by making a DELETE request to the pairings endpoint.
   *
   * @returns {*} {Promise<void>} A promise that resolves when the pairings are successfully removed - resolves even if there were no pairings to delete.
   */
  const forgetAllPairings = useCallback(async () => {
    return withAccount<void>(async (account) => {
      const { clientID } = account
      await apiClient.delete(`${apiClient.endpoints.cardTap}/v3/devices/${clientID}/pairings`)
    })
  }, [apiClient])

  return useMemo(
    () => ({
      loginByPairingCode,
      forgetAllPairings,
    }),
    [loginByPairingCode, forgetAllPairings]
  )
}

export default usePairingApi
