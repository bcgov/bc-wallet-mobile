import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import React, { createContext, useEffect, useState } from 'react'

import { BCState } from '@/store'
import BCSCApiClient from '../api/client'

export interface BCSCApiClientContextType {
  client: BCSCApiClient | null
  isReady: boolean
  error: string | null
}

export const BCSCApiClientContext = createContext<BCSCApiClientContextType>({
  client: null,
  isReady: false,
  error: null,
})

export const BCSCApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, dispatch] = useStore<BCState>()
  const [client, setClient] = useState<BCSCApiClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    if (!store.stateLoaded) {
      return
    }

    const configureClient = async () => {
      setIsReady(false)
      setError(null)

      try {
        const newClient = new BCSCApiClient(store.developer.environment.iasApiBaseUrl, logger as RemoteLogger)
        await newClient.fetchEndpointsAndConfig(store.developer.environment.iasApiBaseUrl)

        setClient(newClient)
        setIsReady(true)
      } catch (err) {
        const errorMessage = `Failed to configure BCSC client for ${store.developer.environment.name}: ${err}`
        setError(errorMessage)
        setClient(null)
        setIsReady(false)
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

  return <BCSCApiClientContext.Provider value={{ client, isReady, error }}>{children}</BCSCApiClientContext.Provider>
}
