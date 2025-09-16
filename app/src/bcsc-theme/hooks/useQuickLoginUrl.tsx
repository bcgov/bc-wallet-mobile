import { TOKENS, useServices } from '@bifold/core'
import { useEffect, useState } from 'react'
import useApi from '../api/hooks/useApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { createQuickLoginJWT, getAccount } from 'react-native-bcsc-core'
import { getNotificationTokens } from '../utils/push-notification-tokens'
import useDataLoader from './useDataLoader'
import { useBCSCApiClient } from './useBCSCApiClient'

// Only a subset of the ClientMetadata is needed for this hook
type ClientMetadataStub = Pick<ClientMetadata, 'client_ref_id' | 'initiate_login_uri'>

// The result type is a tuple of [quickLoginUrl, quickLoginError]
type QuickLoginURLResult = [string | null, string | null]

// Represents a stub service client with an empty client_ref_id
export const STUB_SERVICE_CLIENT: ClientMetadataStub = { client_ref_id: '' }

/**
 * A custom hook to generate a quick login URL for a specific service client
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#IAS-Client-Metadata-endpoint

 * @param {ClientMetadataStub} serviceClient The serviceClient metadata object for which to generate the quick login URL
 * @returns {*} {QuickLoginURLResult} A tuple containing the quick login URL (or null if not available) and an error message (or null if no error)
 */
export const useQuickLoginURL = (serviceClient: ClientMetadataStub): QuickLoginURLResult => {
  const { jwks } = useApi()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [quickLoginUrl, setQuickLoginUrl] = useState<string | null>(null)
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null)

  const handleQuickLoginUpdate = (url: string | null, error: string | null): void => {
    setQuickLoginUrl(url)
    setQuickLoginError(error)
  }

  const onError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    handleQuickLoginUpdate(null, errorMessage)
  }

  const { load: loadJwk, ...jwkDataLoader } = useDataLoader(jwks.getFirstJwk, { onError })
  const { load: loadTokens, ...tokensDataLoader } = useDataLoader(getNotificationTokens, { onError })
  const { load: loadAccount, ...accountDataLoader } = useDataLoader(getAccount, { onError })

  useEffect(() => {
    loadJwk()
    loadTokens()
    loadAccount()
  }, [loadJwk, loadTokens, loadAccount])

  useEffect(() => {
    const asyncEffect = async () => {
      // If any of the data loaders are not ready, we cannot create a quick login URL
      if (!jwkDataLoader.isReady || !tokensDataLoader.isReady || !accountDataLoader.isReady) {
        handleQuickLoginUpdate(null, null)
        return
      }

      // If the serviceClient does not have an initiate_login_uri, we cannot create a quick login URL
      if (!serviceClient.initiate_login_uri) {
        handleQuickLoginUpdate(null, 'Quick login unavailable for this service')
        return
      }

      if (!jwkDataLoader.data) {
        handleQuickLoginUpdate(null, 'No JWK received from server')
        return
      }

      if (!tokensDataLoader.data) {
        handleQuickLoginUpdate(null, 'No notification tokens received')
        return
      }

      if (!accountDataLoader.data) {
        handleQuickLoginUpdate(null, 'No account data received')
        return
      }

      if (!client.tokens?.access_token) {
        handleQuickLoginUpdate(null, 'No access token available')
        return
      }

      try {
        const loginHint = await createQuickLoginJWT(
          client.tokens.access_token,
          accountDataLoader.data.clientID,
          accountDataLoader.data.issuer,
          serviceClient.client_ref_id,
          jwkDataLoader.data,
          tokensDataLoader.data.fcmDeviceToken,
          tokensDataLoader.data.apnsToken
        )

        const encodedTokenHint = encodeURIComponent(loginHint)
        handleQuickLoginUpdate(`${serviceClient.initiate_login_uri}?login_hint=${encodedTokenHint}`, null)
      } catch (error) {
        logger.error('Error creating quick login URL', error as Error)
        handleQuickLoginUpdate(null, `Error creating quick login URL: ${(error as Error).message}`)
      }
    }

    asyncEffect()
  }, [
    serviceClient,
    logger,
    client.tokens?.access_token,
    jwkDataLoader.data,
    tokensDataLoader.data,
    accountDataLoader.data,
    jwkDataLoader.isReady,
    tokensDataLoader.isReady,
    accountDataLoader.isReady,
  ])

  return [quickLoginUrl, quickLoginError]
}
