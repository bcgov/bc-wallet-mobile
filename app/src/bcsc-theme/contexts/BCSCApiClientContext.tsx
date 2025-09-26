import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import React, { createContext, useEffect, useMemo, useState } from 'react'
import { BCState } from '@/store'
import BCSCApiClient from '../api/client'

// Singleton instance of BCSCApiClient
let BCSC_API_CLIENT_SINGLETON: BCSCApiClient | null = null

export interface BCSCApiClientContextType {
  client: BCSCApiClient | null
  clientIsReady: boolean
  error: string | null
}

export const BCSCApiClientContext = createContext<BCSCApiClientContextType>({
  client: null,
  clientIsReady: false,
  error: null,
})

export const BCSCApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, dispatch] = useStore<BCState>()
  const [clientIsReady, setClientIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    // Only attempt to configure the client if the store is loaded and the IAS API base URL is available
    if (!store.stateLoaded || !store.developer.environment.iasApiBaseUrl) {
      return
    }

    const configureClient = async () => {
      setClientIsReady(false)
      setError(null)

      try {
        // If the singleton doesn't exist or the base URL has changed, create a new instance
        if (
          !BCSC_API_CLIENT_SINGLETON ||
          BCSC_API_CLIENT_SINGLETON.baseURL !== store.developer.environment.iasApiBaseUrl
        ) {
          const newClient = new BCSCApiClient(store.developer.environment.iasApiBaseUrl, logger as RemoteLogger)
          await newClient.fetchEndpointsAndConfig()

          BCSC_API_CLIENT_SINGLETON = newClient
        }

        setClientIsReady(true)
      } catch (err) {
        const errorMessage = `Failed to configure BCSC client for ${store.developer.environment.name}: ${
          (err as Error)?.message
        }`
        setError(errorMessage)

        BCSC_API_CLIENT_SINGLETON = null

        setClientIsReady(false)
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
    }

    configureClient()
  }, [store.stateLoaded, store.developer.environment.name, store.developer.environment.iasApiBaseUrl, logger, dispatch])

  const contextValue = useMemo(
    () => ({
      client: BCSC_API_CLIENT_SINGLETON,
      clientIsReady,
      error,
    }),
    [clientIsReady, error]
  )

  return <BCSCApiClientContext.Provider value={contextValue}>{children}</BCSCApiClientContext.Provider>
}
