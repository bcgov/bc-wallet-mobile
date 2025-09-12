import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TOKENS, useServices } from '@bifold/core'
import { useEffect, useState } from 'react'
import client from '../api/client'
import { createQuickLoginHint } from '../utils/quick-login'

/**
 * A custom hook to generate a quick login URL for a specific endpoint
 *
 * @param endpoint The final endpoint we wish to be routed to after login
 * @returns The generated quick login URL or null if not available
 */
const useQuickLoginUrl = (endpoint: string) => {
  const { jwks, metadata } = useApi()
  const [url, setUrl] = useState<string | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const key = await jwks.getFirstJwk()
        if (!key) {
          throw new Error('No JWK received from server')
        }

        const clients = await metadata.getClientMetadata()
        if (!clients || clients.length === 0) {
          throw new Error('No client metadata received from server')
        }

        const uri = `${client.baseURL}/${endpoint}`
        const validClients = clients.filter((c) => c.client_uri === uri)
        const clientRefId = validClients[0].client_ref_id

        const quickLoginHint = await createQuickLoginHint({ clientRefId: clientRefId, jwk: key })

        const encodedHint = encodeURIComponent(quickLoginHint)
        const fullUrl = `${client.baseURL}/login/initiate?login_hint=${encodedHint}`
        setUrl(fullUrl)
      } catch (error) {
        logger.error(`Error attempting to create quick login URL: ${error}`)
      }
    }

    asyncEffect()
  }, [endpoint, logger, jwks, metadata])

  return url
}

export default useQuickLoginUrl
