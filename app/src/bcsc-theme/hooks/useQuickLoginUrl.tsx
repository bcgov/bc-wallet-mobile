import useApi from '@/bcsc-theme/api/hooks/useApi'
import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import { TOKENS, useServices } from '@bifold/core'
import { useEffect, useState } from 'react'
import { createQuickLoginJWT, getAccount } from 'react-native-bcsc-core'
import client from '../api/client'

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

        const { apnsToken, fcmDeviceToken } = await getNotificationTokens()
        const account = await getAccount()

        if (!account?.clientID || !account?.issuer) {
          throw new Error('Account information is missing or incomplete')
        }

        if (!client.tokens?.access_token) {
          throw new Error('Access token is missing')
        }

        const uri = `${client.baseURL}/${endpoint}`
        const validClients = clients.filter((c) => c.client_uri === uri)
        const clientRefId = validClients[0].client_ref_id

        const hint = await createQuickLoginJWT(
          client.tokens.access_token,
          account.clientID,
          account.issuer,
          clientRefId,
          key,
          fcmDeviceToken,
          apnsToken
        )

        const encodedHint = encodeURIComponent(hint)
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
