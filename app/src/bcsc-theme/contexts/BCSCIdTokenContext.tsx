import { TOKENS, useServices } from '@bifold/core'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import useApi from '../api/hooks/useApi'
import useDataLoader from '../hooks/useDataLoader'
import { IdToken } from '../utils/id-token'

export interface BCSCIdTokenContextType<T> {
  isLoading: boolean
  data: T | null
  refreshData: () => void
}

export const BCSCIdTokenContext = createContext<BCSCIdTokenContextType<IdToken> | null>(null)

/**
 * Provides the BCSCIdTokenContext to child components, managing the loading of ID token data.
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {JSX.Element} The BCSCIdTokenProvider component wrapping its children.
 */
export const BCSCIdTokenProvider = ({ children }: PropsWithChildren) => {
  const api = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const { data, load, isLoading, refresh } = useDataLoader(
    () => api.token.getCachedIdTokenMetadata({ refreshCache: true }),
    {
      onError: (error) => logger.error('BCSCIdTokenProvider: Failed to load ID Token metadata', error as Error),
    }
  )

  useEffect(() => {
    load()
  }, [load])

  const contextValue = useMemo(() => {
    if (!data) {
      return {
        isLoading: isLoading,
        data: null,
        refreshData: () => {},
      } as BCSCIdTokenContextType<IdToken>
    }

    return {
      isLoading: false,
      data: data,
      refreshData: refresh,
    } as BCSCIdTokenContextType<IdToken>
  }, [data, isLoading, refresh])

  return <BCSCIdTokenContext.Provider value={contextValue}>{children}</BCSCIdTokenContext.Provider>
}

/**
 * Hook to access the BCSC ID token context.
 *
 * @returns {{ idToken: IdToken, isLoading: boolean, refreshIdToken: () => void }} The token data and loading state.
 */
export const useIdToken = () => {
  const context = useContext(BCSCIdTokenContext)

  if (!context) {
    throw new Error('useIdToken must be used within a BCSCIdTokenProvider')
  }

  if (context.isLoading) {
    throw new Error('useIdToken: ID token is still loading')
  }

  if (!context.data) {
    throw new Error('useIdToken: ID token is null')
  }

  return { idToken: context.data, isLoading: context.isLoading, refreshIdToken: context.refreshData }
}
