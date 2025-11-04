import { useCallback, useMemo } from 'react'
import { AccountSecurityMethod, getAccount, getDynamicClientRegistrationBody, setAccount } from 'react-native-bcsc-core'

import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { BCDispatchAction, BCSCState, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'

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

// The registration API is a bit of a special case because it gets called during initialization,
// so its params are adjusted to account for an api client that may not be ready yet
const useRegistrationApi = (apiClient: BCSCApiClient | null, isClientReady: boolean = true) => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const register = useCallback(async () => {
    if (!isClientReady || !apiClient) {
      throw new Error('BCSC client not ready for registration')
    }

    const account = await getAccount()
    // If an account already exists, we don't need to register again
    if (account) {
      logger.info('Account already exists, skipping registration')
      return
    }

    logger.info('No account found, proceeding with registration')

    // TODO:(jl) Using test tokens for now until we can reliably get
    // real ones during setup. Need to debug why they fail from Testflight.
    let fcmDeviceToken = 'test_fcmDeviceToken'
    let apnsToken: string | null = 'test_apnsToken'

    // Try to get real notification tokens, fall back to test tokens if it fails
    try {
      logger.debug('Fetching notification tokens for registration')
      const tokens = await getNotificationTokens(logger)

      fcmDeviceToken = tokens.fcmDeviceToken || fcmDeviceToken
      apnsToken = tokens.apnsToken || apnsToken

      logger.info('Successfully retrieved notification tokens for registration')
    } catch (error) {
      logger.warn(
        `Failed to retrieve notification tokens, using fallback tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    logger.debug(
      `Final tokens for registration - FCM: ${fcmDeviceToken ? 'present' : 'missing'}, APNS: ${
        apnsToken ? 'present' : 'missing'
      }`
    )

    const body = await getDynamicClientRegistrationBody(fcmDeviceToken, apnsToken || '')
    logger.info('Generated dynamic client registration body')

    const { data } = await apiClient.post<RegistrationResponseData>(apiClient.endpoints.registration, body, {
      headers: { 'Content-Type': 'application/json' },
      skipBearerAuth: true,
    })

    logger.info('Completed registration request')

    dispatch({
      type: BCDispatchAction.UPDATE_REGISTRATION_ACCESS_TOKEN,
      payload: [{ registrationAccessToken: data.registration_access_token }],
    })

    logger.info(`Storing new account information locally, ${data.client_id}, issuer: ${apiClient.endpoints.issuer}`)
    await setAccount({
      clientID: data.client_id,
      issuer: apiClient.endpoints.issuer,
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    })

    return data
  }, [isClientReady, apiClient, logger, dispatch])

  const updateRegistration = useCallback(
    async (bcsc: BCSCState) => {
      return withAccount(async (account) => {
        if (!isClientReady || !apiClient) {
          throw new Error('BCSC client not ready for registration update')
        }

        const registrationAccessToken = bcsc.registrationAccessToken
        if (!registrationAccessToken) {
          throw new Error('No registration access token found for registration update')
        }

        const clientName = bcsc.selectedNickname
        if (!clientName) {
          throw new Error('No client name found for registration update')
        }

        let fcmDeviceToken = 'fallback_fcm_token'
        let apnsToken = ''

        try {
          const tokens = await getNotificationTokens(logger)
          fcmDeviceToken = tokens.fcmDeviceToken ?? fcmDeviceToken
          apnsToken = tokens.apnsToken ?? apnsToken
        } catch (error) {
          // Log warning but continue with fallback tokens
          logger.warn(
            `Failed to retrieve tokens for registration update: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }

        const body = await getDynamicClientRegistrationBody(fcmDeviceToken, apnsToken)

        let updatedRegistrationData: RegistrationResponseData | null = null

        try {
          const updatePayload = typeof body === 'string' ? JSON.parse(body) : body
          // Add required fields for PUT request: client_id, client_name, and scope
          updatePayload.client_id = account.clientID
          updatePayload.client_name = clientName
          updatePayload.scope = 'openid profile address offline_access'

          const { data } = await apiClient.put<RegistrationResponseData>(
            `${apiClient.endpoints.registration}/${account.clientID}`,
            updatePayload,
            {
              skipBearerAuth: true,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${registrationAccessToken}`,
              },
            }
          )

          updatedRegistrationData = data
        } catch (error) {
          logger.error('Failed to update registration', { error })
          throw error
        }

        logger.info('Completed registration update request')

        dispatch({
          type: BCDispatchAction.UPDATE_REGISTRATION_ACCESS_TOKEN,
          payload: [{ registrationAccessToken: updatedRegistrationData?.registration_access_token }],
        })

        await setAccount({
          clientID: updatedRegistrationData?.client_id,
          issuer: apiClient.endpoints.issuer,
          securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
          nickname: bcsc.selectedNickname,
          didPostNicknameToServer: true,
        })

        return updatedRegistrationData
      })
    },
    [isClientReady, apiClient, logger, dispatch]
  )

  const deleteRegistration = useCallback(
    async (clientId: string) => {
      if (!isClientReady || !apiClient) {
        throw new Error('BCSC client not ready for registration deletion')
      }

      const registrationAccessToken = store.bcsc.registrationAccessToken

      const { status } = await apiClient.delete(`${apiClient.endpoints.registration}/${clientId}`, {
        skipBearerAuth: true,
        headers: {
          Authorization: `Bearer ${registrationAccessToken}`,
        },
      })

      // 200 level status codes indicate success
      return { success: status > 199 && status < 300 }
    },
    [isClientReady, apiClient, store.bcsc.registrationAccessToken]
  )

  return useMemo(
    () => ({
      register,
      updateRegistration,
      deleteRegistration,
    }),
    [register, updateRegistration, deleteRegistration]
  )
}

export default useRegistrationApi
