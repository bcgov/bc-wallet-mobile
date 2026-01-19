import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BCSCApiClient from '../api/client'
import { ClientErrorHandlingPolicies, ErrorMatcherContext } from '../api/clientErrorPolicies'
import { isNetworkError } from '../utils/error-utils'

// Singleton instance of BCSCApiClient
let BCSC_API_CLIENT_SINGLETON: BCSCApiClient | null = null

/**
 * Returns the current BCSCApiClient singleton instance.
 * Can be used outside of React components (e.g., in ViewModels).
 * Returns null if the client hasn't been initialized yet.
 */
export const getBCSCApiClient = (): BCSCApiClient | null => BCSC_API_CLIENT_SINGLETON

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
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [client, setClient] = useState<BCSCApiClient | null>(BCSC_API_CLIENT_SINGLETON)
  const [error, setError] = useState<string | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorAlert } = useErrorAlert()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()

  /**
   * Sets both the local state and the singleton instance of the BCSCApiClient.
   *
   * @param client - The BCSCApiClient instance to set.
   * @returns void
   */
  const setClientAndSingleton = (client: BCSCApiClient | null) => {
    BCSC_API_CLIENT_SINGLETON = client
    setClient(client)
  }

  /**
   * Handles client errors based on predefined error handling policies.
   *
   * @param error - The error object to handle.
   * @param context - The context providing additional information for error handling.
   * @returns void
   */
  const handleApiClientError = useCallback(
    (error: AppError, context: ErrorMatcherContext) => {
      const policy = ClientErrorHandlingPolicies.find((policy) =>
        policy.matches(error, {
          endpoint: context.endpoint,
          apiEndpoints: context.apiEndpoints,
        })
      )

      if (!policy) {
        logger.info('[ApiClient] No error handling policy for:', {
          endpoint: context.endpoint,
          appEvent: error.appEvent,
        })
        return
      }

      policy.handle(error, { emitErrorAlert, navigation, translate: t })
    },
    [emitErrorAlert, logger, navigation, t]
  )

  useEffect(() => {
    // Only attempt to configure the client if the store is loaded and the IAS API base URL is available
    if (!store.stateLoaded || !store.developer.environment.iasApiBaseUrl) {
      return
    }

    const configureClient = async () => {
      setError(null)

      // Use the singleton as reference to prevent infinite re-renders
      let newClient = BCSC_API_CLIENT_SINGLETON

      try {
        // If the singleton doesn't exist or the base URL has changed, create a new instance
        if (
          !BCSC_API_CLIENT_SINGLETON ||
          BCSC_API_CLIENT_SINGLETON.baseURL !== store.developer.environment.iasApiBaseUrl
        ) {
          newClient = new BCSCApiClient(
            store.developer.environment.iasApiBaseUrl,
            logger as RemoteLogger,
            handleApiClientError
          )
          await newClient.fetchEndpointsAndConfig()

          setClientAndSingleton(newClient)
        }
      } catch (err) {
        /**
         * Special case:
         * If it's a network error, we still want to set the client.
         * This prevents the app from being blocked by a permanent loading state,
         * while also alowing the Internet Disconnected modal to be displayed.
         */
        if (isNetworkError(err)) {
          setClientAndSingleton(newClient)
          return
        }

        const errorMessage = `Failed to configure BCSC client for ${store.developer.environment.name}: ${
          (err as Error)?.message
        }`

        setClientAndSingleton(null)
        setError(errorMessage)
      }
    }

    configureClient()
  }, [
    store.stateLoaded,
    store.developer.environment.name,
    store.developer.environment.iasApiBaseUrl,
    logger,
    dispatch,
    handleApiClientError,
  ])

  const contextValue = useMemo(
    () => ({
      client: client,
      isClientReady: Boolean(client),
      error: error,
    }),
    [client, error]
  )

  return <BCSCApiClientContext.Provider value={contextValue}>{children}</BCSCApiClientContext.Provider>
}

// This function is used to reset the singleton instance in tests
export function _resetBCSCApiClientSingleton() {
  BCSC_API_CLIENT_SINGLETON = null
}
