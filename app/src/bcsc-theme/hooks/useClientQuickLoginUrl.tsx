import { TOKENS, useServices } from '@bifold/core'
import { useEffect, useState } from 'react'
import useApi from '../api/hooks/useApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { createQuickLoginHint } from '../utils/quick-login'

// Only a subset of the ClientMetadata is needed for this hook
type ClientMetadataStub = Pick<ClientMetadata, 'client_ref_id' | 'initiate_login_uri'>

/**
 * A custom hook to generate a quick login URL for a specific client
 *
 * @param {ClientMetadataStub} client The client metadata object for which to generate the quick login URL
 * @returns {*} {string | null}The generated quick login URL or null if not available
 *
 */
export const useClientQuickLoginUrl = (client: ClientMetadataStub): string | null => {
  const { jwks, metadata } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [quickLoginUrl, setQuickLoginUrl] = useState<string | null>(null)

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        if (!client.initiate_login_uri) {
          throw new Error('Client does not support OIDC login')
        }

        const jwk = await jwks.getFirstJwk()

        if (!jwk) {
          throw new Error('No JWK received from server')
        }

        const quickLoginHint = await createQuickLoginHint({ clientRefId: client.client_ref_id, jwk: jwk })

        setQuickLoginUrl(`${client.initiate_login_uri}?login_hint=${quickLoginHint}`)
      } catch (error) {
        logger.error(`Error attempting to create quick login URL`, error as Error)
        setQuickLoginUrl(null)
      }
    }

    asyncEffect()
  }, [client, jwks, metadata, logger])

  return quickLoginUrl
}
