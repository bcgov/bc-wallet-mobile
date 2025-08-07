import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useState } from 'react'
import { getToken, TokenType } from 'react-native-bcsc-core'

import { BCDispatchAction, BCState } from '@/store'
import client from '../api/client'
import useApi from '../api/hooks/useApi'

const useInitializeBcscApi = () => {
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    if (!store.stateLoaded) {
      return
    }

    const asyncEffect = async () => {
      try {
        await client.fetchEndpointsAndConfig(client.baseURL)
      } catch (error) {
        logger.error('Failed to fetch BCSC endpoints', {
          message: error instanceof Error ? error.message : String(error),
        })
        dispatch({
          type: DispatchAction.BANNER_MESSAGES,
          payload: [
            {
              id: 'IASServerError',
              title: 'Unable to retrieve server status',
              type: 'error',
              variant: 'summary',
              dismissible: true,
            },
          ],
        })
      }

      try {
        await registration.register()
      } catch (error) {
        logger.error(`Error during registration: ${error}`)
      }

      try {
        let token
        if (!store.bcsc.refreshToken) {
          const tokenInfo = await getToken(TokenType.Refresh)
          token = tokenInfo?.token
          // TODO: Get device code from bcsc core package
          dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [token] })
        } else {
          token = store.bcsc.refreshToken
        }

        if (token) {
          const tokenData = await client.getTokensForRefreshToken(token)
          if (tokenData.bcsc_devices_count !== undefined) {
            dispatch({
              type: BCDispatchAction.UPDATE_DEVICE_COUNT,
              payload: [tokenData.bcsc_devices_count],
            })
          }

          dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        }
      } catch (error) {
        logger.error(`Error setting API client tokens: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.stateLoaded])

  return { loading }
}

export default useInitializeBcscApi
