import { getAppStoreReceipt, googleAttestation } from '@bifold/react-native-attestation'
import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import {
  AccountSecurityMethod,
  getAccount,
  getDeviceId,
  getDynamicClientRegistrationBody,
  setAccount,
} from 'react-native-bcsc-core'

import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { BCDispatchAction, BCState } from '@/store'
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

export interface NonceResponseData {
  nonce: string
}

// The registration API is a special case because it gets called during initialization,
// so its params are adjusted to account for an api client that may not be ready yet
const useRegistrationApi = (apiClient: BCSCApiClient | null, isClientReady: boolean = true) => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const getAttestation = useCallback(async (): Promise<string | null> => {
    if (!isClientReady || !apiClient) {
      throw new Error('BCSC client not ready for attestation')
    }

    logger.info(`Attempting attestation for registration on ${Platform.OS}`)
    let attestation: string | null = null
    try {
      if (Platform.OS === 'ios') {
        attestation = await getAppStoreReceipt()
        logger.info('Obtained iOS App Store Receipt attestation')
      } else if (Platform.OS === 'android') {
        const deviceId = await getDeviceId()
        const {
          data: { nonce },
        } = await apiClient.post<NonceResponseData>(
          `${apiClient.baseURL}/device/nonces/${Platform.OS}`,
          {
            device_id: deviceId,
          },
          {
            skipBearerAuth: true,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        )
        attestation = await googleAttestation(nonce)
        logger.info('Obtained Android Play Integrity attestation')
      }
    } catch (error) {
      // attestation in BCSC v3 (and v4 phase 1) is non-blocking, so we log and continue
      logger.warn(`Attestation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    return attestation
  }, [apiClient, isClientReady, logger])

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

    const [attestation, { fcmDeviceToken, deviceToken }] = await Promise.all([
      getAttestation(),
      getNotificationTokens(logger),
    ])

    const body = await getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken, attestation)
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
  }, [isClientReady, apiClient, logger, dispatch, getAttestation])

  const updateRegistration = useCallback(
    async (registrationAccessToken: string | undefined, selectedNickname: string | undefined) => {
      return withAccount(async (account) => {
        if (!isClientReady || !apiClient) {
          throw new Error('BCSC client not ready for registration update')
        }

        if (!registrationAccessToken) {
          throw new Error('No registration access token found for registration update')
        }

        if (!selectedNickname) {
          throw new Error('No client name found for registration update')
        }

        const [attestation, { fcmDeviceToken, deviceToken }] = await Promise.all([
          getAttestation(),
          getNotificationTokens(logger),
        ])

        const body = await getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken, attestation)

        let updatedRegistrationData: RegistrationResponseData | null = null

        try {
          const updatePayload = body ? JSON.parse(body) : body
          // Add required fields for PUT request: client_id, client_name, and scope
          updatePayload.client_id = account.clientID
          updatePayload.client_name = selectedNickname
          updatePayload.scope = 'openid profile email address offline_access'

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
          nickname: selectedNickname,
          didPostNicknameToServer: true,
        })

        return updatedRegistrationData
      })
    },
    [isClientReady, apiClient, logger, dispatch, getAttestation]
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
