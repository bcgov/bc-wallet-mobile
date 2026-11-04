import { throwAppError, throwNativeBcscError } from '@/bcsc-theme/utils/native-error-map'
import { getNotificationTokens, getPushTokenStatus } from '@/bcsc-theme/utils/push-notification-tokens'
import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { trackFailureSteps } from '@/errors/failureContext'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { ChallengeSource, signPairingCode } from 'react-native-bcsc-core'
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

// Where logging in by pairing code can fail, reported as `failure_step`
type PairingStep = 'account' | 'notification_tokens' | 'sign_pairing_code' | 'verify_device_assertion'

const usePairingApi = (apiClient: BCSCApiClient) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Logs in a user using a pairing code and returns the client metadata.
   *
   * @param {string} code - The pairing code to use for login.
   * @param {ChallengeSource} challengeSource - How the login was initiated; reported to IAS in the assertion.
   * @returns {*} {Promise<PairingCodeLoginClientMetadata>} A promise that resolves to the client metadata.
   */
  const loginByPairingCode = useCallback(
    async (code: string, challengeSource: ChallengeSource) => {
      const steps = trackFailureSteps<PairingStep>('pairing', { definition: ErrorRegistry.LOGIN_DEVICE_ERROR })

      return steps.run('account', () =>
        withAccount<PairingCodeLoginClientMetadata>(async (account) => {
          const { issuer, clientID } = account

          const tokens = await steps.run('notification_tokens', () => getNotificationTokens(logger))
          const { fcmDeviceToken, deviceToken } = tokens

          // Placeholder push tokens are sent silently when Firebase fails; record it in case the server rejects them
          steps.note(getPushTokenStatus(tokens))

          const signedCode = await steps.run('sign_pairing_code', async () => {
            let signed: string | null
            try {
              signed = await signPairingCode(code, issuer, clientID, fcmDeviceToken, deviceToken, challengeSource)
            } catch (error) {
              return throwNativeBcscError(error)
            }
            if (!signed) {
              return throwAppError(new Error('signPairingCode returned null'), ErrorRegistry.SIGN_CLAIMS_ERROR)
            }
            return signed
          })

          const response = await steps.run(
            'verify_device_assertion',
            () =>
              apiClient.post<PairingCodeLoginClientMetadata>(
                `${apiClient.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`,
                { assertion: signedCode },
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
              ),
            { keepAppError: true }
          )

          return response.data
        })
      )
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
