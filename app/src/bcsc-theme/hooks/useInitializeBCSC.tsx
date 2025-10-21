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
  const { client, isClientReady } = useBCSCApiClientState()
  const { register } = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [loading, setLoading] = useState(false)
  const initializationInProgressRef = useRef(false)

  useEffect(() => {
    if (!store.stateLoaded || !isClientReady || !client || initializationInProgressRef.current) {
      return
    }

    const asyncEffect = async () => {
      initializationInProgressRef.current = true
      setLoading(true)

      try {
        logger.info('Attempting BCSC registration')

        await register()

        logger.info('BCSC registration successful')

        const refreshToken = store.bcsc.refreshToken ?? (await getToken(TokenType.Refresh))?.token

        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refreshToken] })

        // if there is no token, the user will see the verify stack (setup steps),
        if (!refreshToken) {
          return
        }

        // QUESTION (MD): Should this happen here or in the client initialization?
        await client.getTokensForRefreshToken(refreshToken)

        // if there is a valid token the user will be logged in
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
      } catch (error) {
        initializationInProgressRef.current = false
        logger.error(`Error initializing BCSC`, error as Error)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [store.stateLoaded, register, isClientReady, client, dispatch, logger, store.bcsc.refreshToken])

  return { loading }
}

export default useInitializeBCSC
