import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
import { getToken, TokenType } from 'react-native-bcsc-core'

import { BCDispatchAction, BCState } from '@/store'
import useRegistrationApi from '../api/hooks/useRegistrationApi'
import { useBCSCApiClientState } from './useBCSCApiClient'

// Starts first setup of API client, initial registration,
// and, if it exists, uses refresh token to get rest of token info
const useInitializeBCSC = () => {
  const [store, dispatch] = useStore<BCState>()
  const { client, clientIsReady } = useBCSCApiClientState()
  const { register } = useRegistrationApi(client, clientIsReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [loading, setLoading] = useState(true)
  const initializationInProgressRef = useRef(false)

  useEffect(() => {
    if (!store.stateLoaded || !clientIsReady || !client || initializationInProgressRef.current) {
      return
    }

    const asyncEffect = async () => {
      initializationInProgressRef.current = true
      setLoading(true)

      try {
        logger.info('Attempting BCSC registration')
        await register()
        logger.info('BCSC registration successful')
      } catch (error) {
        logger.error(`Error during BCSC registration.`, error as Error)
      }

      try {
        let token
        if (!store.bcsc.refreshToken) {
          const tokenInfo = await getToken(TokenType.Refresh)
          token = tokenInfo?.token
          dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [token] })
        } else {
          token = store.bcsc.refreshToken
        }

        // if there is no token, the user will see the verify stack (setup steps),
        // if there is a valid token the user will be logged in
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
        initializationInProgressRef.current = false
        logger.error(`Error setting API client tokens.`, error as Error)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [store.stateLoaded, register, clientIsReady, client, dispatch, logger, store.bcsc.refreshToken])

  return { loading }
}

export default useInitializeBCSC
