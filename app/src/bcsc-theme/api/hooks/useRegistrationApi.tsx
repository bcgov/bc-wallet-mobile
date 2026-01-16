import { getAppStoreReceipt, googleAttestation } from '@bifold/react-native-attestation'
import { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'
import {
  AccountSecurityMethod,
  getAccount,
  getAccountSecurityMethod,
  getDeviceId,
  getDynamicClientRegistrationBody,
  setAccount,
} from 'react-native-bcsc-core'

import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCState } from '@/store'
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
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateTokens } = useSecureActions()
  const { emitError } = useErrorAlert()
  /**
   * Retrieves platform-specific attestation for device verification.
   *
   * On iOS, fetches App Store receipt. On Android, obtains nonce from server
   * and generates Play Integrity attestation. Attestation failures are logged
   * but non-blocking as per BCSC v3/v4 phase 1 specifications.
   *
   * @returns Promise resolving to attestation string or null if failed
   * @throws Error if BCSC client is not ready
   */
  const getAttestation = useCallback(async (): Promise<string | null> => {
    if (!isClientReady || !apiClient) {
      throw new Error('BCSC client not ready for attestation')
    }

    logger.info(`Attempting attestation for registration on ${Platform.OS}`)
    let attestation: string | null = null
    try {
      if (Platform.OS === 'ios') {
        attestation = await getAppStoreReceipt()
        if (attestation) {
          logger.debug('Obtained iOS App Store Receipt attestation')
        }
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
        logger.debug(`Received nonce for Android Play Integrity attestation`)
        attestation = await googleAttestation(nonce)
        if (attestation) {
          logger.debug(`Obtained Android Play Integrity attestation`)
        }
      }
    } catch (err) {
      // attestation in BCSC v3 (and v4 phase 1) is non-blocking, so we log and continue
      emitError('ATTESTATION_GENERATION_ERROR', { error: err })
    }
    return attestation
  }, [apiClient, isClientReady, logger, emitError])

  /**
   * Registers a new BCSC client with dynamic client registration.
   *
   * Checks for existing account first. If none exists, generates attestation,
   * fetches notification tokens, creates registration body, and submits to BCSC.
   * Stores returned client credentials and updates local account storage.
   *
   * @returns Promise resolving to registration response data or void if account exists
   * @throws Error if BCSC client is not ready or registration fails
   */
  const register = useCallback(
    async (securityMethod: AccountSecurityMethod) => {
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

      await setAccount({
        clientID: data.client_id,
        issuer: apiClient.endpoints.issuer,
        securityMethod,
        nickname: store.bcsc.selectedNickname,
      })

      await updateTokens({
        registrationAccessToken: data.registration_access_token,
      })

      logger.info('Registration access token saved to storage')

      return data
    },
    [isClientReady, apiClient, logger, store.bcsc.selectedNickname, getAttestation, updateTokens]
  )

  /**
   * Updates an existing BCSC client registration with new nickname and attestation.
   *
   * Requires valid registration access token and nickname. Generates fresh attestation
   * and notification tokens, then submits PUT request to update client registration.
   * Updates local account storage with new credentials.
   *
   * @param registrationAccessToken - Bearer token for registration endpoint access
   * @param selectedNickname - New client name/nickname to set
   * @returns Promise resolving to updated registration response data
   * @throws Error if client not ready, missing parameters, or update fails
   */
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

        const body = await getDynamicClientRegistrationBody(fcmDeviceToken, deviceToken, attestation, selectedNickname)

        let updatedRegistrationData: RegistrationResponseData | null = null

        try {
          const updatePayload = body ? JSON.parse(body) : body
          // Add required fields for PUT request: client_id and scope
          updatePayload.client_id = account.clientID
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
          const errMessage = error instanceof Error ? error.message : String(error)
          logger.error(`Failed to update registration: ${errMessage}`)
          throw error
        }

        logger.info('Completed registration update request')
        try {
          const securityMethod = await getAccountSecurityMethod()

          await setAccount({
            clientID: updatedRegistrationData?.client_id,
            issuer: apiClient.endpoints.issuer,
            securityMethod,
            nickname: selectedNickname,
            didPostNicknameToServer: true,
          })

          await updateTokens({
            registrationAccessToken: updatedRegistrationData.registration_access_token,
          })
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error)
          logger.error(`Failed to store updated registration data: ${errMessage}`)
        }

        return updatedRegistrationData
      })
    },
    [isClientReady, apiClient, logger, getAttestation, updateTokens]
  )

  /**
   * Deletes a BCSC client registration from the server.
   *
   * Sends DELETE request to registration endpoint using stored registration
   * access token. Returns success status based on HTTP response code.
   *
   * @param clientId - The client ID to delete from BCSC server
   * @returns Promise resolving to object with success boolean (true for 2xx status)
   * @throws Error if BCSC client is not ready
   */
  const deleteRegistration = useCallback(
    async (clientId: string) => {
      if (!isClientReady || !apiClient) {
        throw new Error('BCSC client not ready for registration deletion')
      }

      const registrationAccessToken = store.bcscSecure.registrationAccessToken

      const { status } = await apiClient.delete(`${apiClient.endpoints.registration}/${clientId}`, {
        skipBearerAuth: true,
        headers: {
          Authorization: `Bearer ${registrationAccessToken}`,
        },
      })

      // 200 level status codes indicate success
      return { success: status > 199 && status < 300 }
    },
    [isClientReady, apiClient, store.bcscSecure.registrationAccessToken]
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
