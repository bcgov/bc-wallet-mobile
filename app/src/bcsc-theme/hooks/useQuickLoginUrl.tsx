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

// Represents a stub service client with an empty client_ref_id
export const STUB_SERVICE_CLIENT: ClientMetadataStub = { client_ref_id: '' }

/**
 * A custom hook to generate a quick login URL for a specific service client
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#IAS-Client-Metadata-endpoint

 * @param {ClientMetadataStub} serviceClient The serviceClient metadata object for which to generate the quick login URL
 * @returns {*} {string | null}The generated quick login URL or null if not available
 */
export const useQuickLoginURL = (serviceClient: ClientMetadataStub): string | null => {
  const { jwks } = useApi()
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [quickLoginUrl, setQuickLoginUrl] = useState<string | null>(null)

  const onError = (error: unknown) => {
    logger.error('Error in useQuickLogin data loader', error as Error)
  }

  const jwkDataLoader = useDataLoader(jwks.getFirstJwk, { onError })
  const tokensDataLoader = useDataLoader(getNotificationTokens, { onError })
  const accountDataLoader = useDataLoader(getAccount, { onError })

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        // If the serviceClient does not have an initiate_login_uri, we cannot create a quick login URL
        if (!serviceClient.initiate_login_uri) {
          setQuickLoginUrl(null)
          return
        }

        jwkDataLoader.load()
        tokensDataLoader.load()
        accountDataLoader.load()

        if (!jwkDataLoader.data) {
          throw new Error('No JWK received from server')
        }

        if (!tokensDataLoader.data) {
          throw new Error('No notification tokens received')
        }

        if (!accountDataLoader.data) {
          throw new Error('No account available')
        }

        if (!client.tokens?.access_token) {
          throw new Error('Access token is missing')
        }

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

        setQuickLoginUrl(`${serviceClient.initiate_login_uri}?login_hint=${encodedTokenHint}`)
      } catch (error) {
        logger.error('useQuickLoginError', error as Error)
        setQuickLoginUrl(null)
      }
    }

    asyncEffect()
  }, [serviceClient, logger, jwkDataLoader, tokensDataLoader, accountDataLoader, client.tokens?.access_token])

  return quickLoginUrl
}
