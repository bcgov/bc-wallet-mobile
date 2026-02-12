import { BCDispatchAction, BCState, CredentialMetadata } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import useApi from '../api/hooks/useApi'
import useDataLoader from '../hooks/useDataLoader'
import { IdToken } from '../utils/id-token'

export interface BCSCIdTokenContextType<T> {
  isLoading: boolean
  data: T | null
  refreshData: () => void
}

/**
 * A helper function to derive credential metadata from the IdToken returned from the token endpoint.
 *
 * @param token The token returned from the token endpoint containing BCSC related claims
 * @returns CredentialMetadata object derived from the token
 */
export const tokenToCredentialMetadata = (token: IdToken): CredentialMetadata => {
  const fullName = `${token.given_name} ${token.family_name}`

  return {
    fullName,
    bcscReason: token.bcsc_reason,
    deviceCount: token.bcsc_devices_count,
    deviceLimit: token.bcsc_max_devices,
    cardType: token.bcsc_card_type,
    lastUpdated: token.bcsc_status_date,
  } as CredentialMetadata
}

/**
 * A helper function to compare 'new' credential metadata from the token endpoint with the existing credential metadata in the store.
 * If any of the values checked are different a false is returned to trigger the system to alert the user that something has happened.
 *
 * @param c1 Credential Metadata object to check
 * @param c2 Credential Metadata object to check
 * @returns boolean returned if both objects are the same, otherwise this returns false
 */
export const compareCredentialMetadata = (c1: CredentialMetadata, c2: CredentialMetadata): boolean => {
  return (
    c1.fullName === c2.fullName &&
    c1.bcscReason === c2.bcscReason &&
    c1.deviceCount === c2.deviceCount &&
    c1.deviceLimit === c2.deviceLimit &&
    c1.cardType === c2.cardType &&
    c1.lastUpdated === c2.lastUpdated
  )
}

export const BCSCIdTokenContext = createContext<BCSCIdTokenContextType<IdToken> | null>(null)

/**
 * Provides the BCSCIdTokenContext to child components, managing the loading of ID token data.
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {React.ReactElement} The BCSCIdTokenProvider component wrapping its children.
 */
export const BCSCIdTokenProvider = ({ children }: PropsWithChildren) => {
  const api = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store, dispatch] = useStore<BCState>()

  const { data, load, isLoading, refresh, isReady } = useDataLoader(
    () => api.token.getCachedIdTokenMetadata({ refreshCache: true }),
    {
      onError: (error) => logger.error('BCSCIdTokenProvider: Failed to load ID Token metadata', error as Error),
    }
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data) {
      return
    }

    const tokenData = tokenToCredentialMetadata(data)
    if (store.bcsc.credentialMetadata) {
      const dataUpdated = compareCredentialMetadata(tokenData, store.bcsc.credentialMetadata)
      if (!dataUpdated) {
        dispatch({
          type: BCDispatchAction.ALERT_REASONING,
          payload: [{ event: data.bcsc_event, reason: data.bcsc_reason }],
        })
      }
    }
    dispatch({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA, payload: [tokenData] })
    // leaving out store.bcsc.credentialMetadata from the dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isReady, dispatch])

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
