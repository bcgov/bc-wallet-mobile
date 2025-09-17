import { TOKENS, useServices } from '@bifold/core'
import useApi from '../api/hooks/useApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { createQuickLoginJWT, getAccount } from 'react-native-bcsc-core'
import { getNotificationTokens } from '../utils/push-notification-tokens'
import { useBCSCApiClient } from './useBCSCApiClient'
import { useCallback } from 'react'

// Only a subset of the ClientMetadata is needed for this hook
type ClientMetadataStub = Pick<ClientMetadata, 'client_ref_id' | 'initiate_login_uri'>

// The result type is a tuple of [quickLoginUrl, quickLoginError]
type QuickLoginURLResult = { success: true; url: string } | { success: false; error: string }

// Represents a stub service client with an empty client_ref_id
export const STUB_SERVICE_CLIENT: ClientMetadataStub = { client_ref_id: '' }

/**
 * A custom hook to generate a quick login URL for a specific service client
 *
 * Note: This hook returns a callback function which generates the quick login URL
 * this is to prevent stale and expired URLs from being used.
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#IAS-Client-Metadata-endpoint
 * @returns {*} {(serviceClient: ClientMetadataStub) => Promise<QuickLoginURLResult>} A function that takes a service client
 * and returns a promise resolving to the quick login URL or an error message.
 */
export const useQuickLoginURL = () => {
  const { jwks } = useApi()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Generates a quick login URL for the given service client.
   *
   * @param {ClientMetadataStub} serviceClient - The service client metadata.
   * @returns {*} {Promise<QuickLoginURLResult>} An object containing the quick login URL or an error message.
   */
  const getQuickLoginURL = useCallback(
    async (serviceClient: ClientMetadataStub): Promise<QuickLoginURLResult> => {
      try {
        if (!serviceClient.initiate_login_uri) {
          return { success: false, error: 'Quick login unavailable for this service' }
        }

        if (!client.tokens?.access_token) {
          return { success: false, error: 'No access token available' }
        }

        const [tokens, account, jwk] = await Promise.all([getNotificationTokens(), getAccount(), jwks.getFirstJwk()])

        if (!tokens) {
          return { success: false, error: 'No notification tokens received' }
        }

        if (!account) {
          return { success: false, error: 'No account data received' }
        }

        if (!jwk) {
          return { success: false, error: 'No JWK received from server' }
        }

        const loginHint = await createQuickLoginJWT(
          client.tokens.access_token,
          account.clientID,
          account.issuer,
          serviceClient.client_ref_id,
          jwk,
          tokens.fcmDeviceToken,
          tokens.apnsToken
        )

        const encodedTokenHint = encodeURIComponent(loginHint)
        return { success: true, url: `${serviceClient.initiate_login_uri}?login_hint=${encodedTokenHint}` }
      } catch (error) {
        logger.error('Error creating quick login URL', error as Error)
        return { success: false, error: `Error creating quick login URL: ${(error as Error).message}` }
      }
    },
    [client, jwks, logger]
  )

  return getQuickLoginURL
}
