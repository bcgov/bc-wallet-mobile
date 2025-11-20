import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getAccount, removeAccount } from 'react-native-bcsc-core'
import BCSCApiClient from '../api/client'
import { isNetworkError } from '../utils/error-utils'

// Singleton instance of BCSCApiClient
let BCSC_API_CLIENT_SINGLETON: BCSCApiClient | null = null

export interface BCSCApiClientContextType {
  client: BCSCApiClient | null
  isClientReady: boolean
  error: string | null
}

export const BCSCApiClientContext = createContext<BCSCApiClientContextType | null>(null)

/**
 * Provides a singleton BCSCApiClient instance to child components via context.
 *
 * The client is initialized based on the current developer environment and automatically
 * reconfigures if the environment changes. If initialization fails, an error state is exposed.
 *
 * Children can access the client, its readiness, and errors via BCSCApiClientContext, or
 * just the client using useBCSCApiClient/useBCSCApiClientState hooks.
 *
 * @param {React.ReactNode} children - The child components that will have access to the BCSCApiClient instance.
 * @returns {*} {JSX.Element} The BCSCApiClientProvider component wrapping its children.
 */
export const BCSCApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, dispatch] = useStore<BCState>()
  const [isClientReady, setIsClientReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleNewClient = useCallback((client: BCSCApiClient | null, errorMessage?: string) => {
    BCSC_API_CLIENT_SINGLETON = client
    setIsClientReady(Boolean(client))
    setError(errorMessage ?? null)
  }, [])

  useEffect(() => {
    // Only attempt to configure the client if the store is loaded and the IAS API base URL is available
    if (!store.stateLoaded || !store.developer.iasApiBaseUrl) {
      return
    }

    const configureClient = async () => {
      let newClient = BCSC_API_CLIENT_SINGLETON

      try {
        // If the singleton doesn't exist or the base URL has changed, create a new instance
        if (!BCSC_API_CLIENT_SINGLETON || BCSC_API_CLIENT_SINGLETON.baseURL !== store.developer.iasApiBaseUrl) {
          // Only set isClientReady to false when we're actually changing clients
          setIsClientReady(false)
          setError(null)

          // Clear old tokens and authentication state when switching environments
          if (BCSC_API_CLIENT_SINGLETON) {
            BCSC_API_CLIENT_SINGLETON.tokens = undefined
            BCSC_API_CLIENT_SINGLETON.tokensPromise = null

            // Check if existing account is from a different environment
            try {
              const existingAccount = await getAccount()
              if (existingAccount) {
                logger.info('Checking existing account issuer', {
                  existingIssuer: existingAccount.issuer,
                  newIssuer: store.developer.iasApiBaseUrl + '/device/',
                })

                // If the issuer doesn't match the new environment, remove the old account
                const newIssuer = `${store.developer.iasApiBaseUrl}/device/`
                if (existingAccount.issuer !== newIssuer) {
                  logger.info('Account from different environment detected, removing old account', {
                    oldIssuer: existingAccount.issuer,
                    newIssuer: newIssuer,
                  })
                  await removeAccount()
                  logger.info('Old account removed successfully')
                  // Remove metadata as well
                  dispatch({ type: BCDispatchAction.CLEAR_BCSC })
                }
              }
            } catch (error) {
              // Rethrow network errors to be handled by outer catch block
              if (isNetworkError(error)) {
                throw error
              }
              logger.error('Error checking/removing old account', { error })
              // Continue even if account removal fails
            }

            // Clear refresh token from store and force re-authentication
            dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [undefined] })
            dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [false] })
          }

          newClient = new BCSCApiClient(store.developer.iasApiBaseUrl, logger as RemoteLogger)

          await newClient.fetchEndpointsAndConfig()

          handleNewClient(newClient)
        } else {
          // Ensure isClientReady is set even when reusing existing client
          handleNewClient(BCSC_API_CLIENT_SINGLETON)
        }
      } catch (err) {
        logger.error('Error during client configuration', {
          error: err,
          isNetworkError: isNetworkError(err),
        })

        /**
         * Special case:
         * If it's a network error, we still want to set the client.
         * This prevents the app from being blocked by a permanent loading state,
         * while also alowing the Internet Disconnected modal to be displayed.
         */
        if (isNetworkError(err)) {
          handleNewClient(newClient)
          return
        }

        /**
         * Handle 404 errors (endpoint not found):
         * Set the client anyway to prevent endless loading, but show an error banner
         * to guide users to check their environment settings.
         */
        const is404Error = (err as any)?.response?.status === 404
        if (is404Error) {
          logger.warn('OpenID configuration endpoint not found (404). App will continue but authentication may fail.')
          handleNewClient(newClient)

          dispatch({
            type: BCDispatchAction.ADD_BANNER_MESSAGE,
            payload: [
              {
                id: 'ias-endpoint-404',
                type: 'error',
                title: 'IAS Endpoint Not Found',
                message: 'The selected IAS environment endpoint was not found. Please check your environment settings.',
              },
            ],
          })
          return
        }

        const errorMessage = `Failed to configure BCSC client for ${store.developer.iasApiBaseUrl}: ${
          (err as Error)?.message
        }`
        handleNewClient(null, errorMessage)
      }
    }

    configureClient()
  }, [store.stateLoaded, store.developer.iasApiBaseUrl, logger, dispatch, handleNewClient])

  const contextValue = useMemo(
    () => ({
      client: BCSC_API_CLIENT_SINGLETON,
      isClientReady,
      error,
    }),
    [isClientReady, error]
  )

  return <BCSCApiClientContext.Provider value={contextValue}>{children}</BCSCApiClientContext.Provider>
}

// This function is used to reset the singleton instance in tests
export function _resetBCSCApiClientSingleton() {
  BCSC_API_CLIENT_SINGLETON = null
}
