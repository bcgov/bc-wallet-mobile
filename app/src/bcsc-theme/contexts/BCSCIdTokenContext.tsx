import { getFullDisplayName } from '@/bcsc-theme/utils/account-utils'
import { BCSCEventTypes } from '@/events/eventTypes'
import { CredentialMetadata } from '@/store'
import { TOKENS, useServices } from '@bifold/core'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef } from 'react'
import { DeviceEventEmitter } from 'react-native'
import useApi from '../api/hooks/useApi'
import useDataLoader from '../hooks/useDataLoader'
import { useRetryOnReconnect } from '../hooks/useRetryOnReconnect'
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
  const fullName = getFullDisplayName(token)

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
 * Normalizes a fullName value that may have been produced by the legacy
 * `${given_name} ${family_name}` template, which rendered a literal
 * "undefined " prefix (and/or stray whitespace) for mononym users whose
 * given_name was absent. This lets {@link compareCredentialMetadata} treat a
 * legacy-stored mononym value as equivalent to the corrected
 * {@link getFullDisplayName} output, avoiding a one-time false-positive
 * "account updated" alert for existing mononym users. See #4258.
 *
 * @param fullName Stored or freshly-computed fullName value to normalize
 * @returns The fullName with any legacy "undefined " prefix stripped and whitespace collapsed/trimmed
 */
const normalizeLegacyFullName = (fullName: string | undefined): string =>
  (fullName ?? '')
    .replace(/^undefined\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * A helper function to compare 'new' credential metadata from the token endpoint with the existing credential metadata in the store.
 * If any of the values checked are different a false is returned to trigger the system to alert the user that something has happened.
 *
 * fullName is compared after normalizing away the legacy mononym artifact (see {@link normalizeLegacyFullName})
 * so existing mononym users don't get a spurious "account updated" alert purely from the fullName bugfix.
 *
 * @param c1 Credential Metadata object to check
 * @param c2 Credential Metadata object to check
 * @returns boolean returned if both objects are the same, otherwise this returns false
 */
export const compareCredentialMetadata = (
  c1: CredentialMetadata | undefined,
  c2: CredentialMetadata | undefined
): boolean => {
  if (!c1 || !c2) {
    return false
  }
  return (
    normalizeLegacyFullName(c1.fullName) === normalizeLegacyFullName(c2.fullName) &&
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

  // On initial mount, use the cached tokens from hydrateSecureState or brand new verification
  // Subsequent refreshes (e.g. refreshIdToken) fetch fresh tokens from the server
  const isInitialLoad = useRef(true)

  const { data, load, isLoading, refresh } = useDataLoader(
    async () => {
      // On initial mount, use the cached tokens (hydrated at startup, or rebuilt
      // from secure storage on demand by getCachedIdTokenMetadata). Subsequent
      // refreshes fetch fresh tokens from the server for the latest ID token.
      const shouldRefresh = !isInitialLoad.current
      isInitialLoad.current = false
      return api.token.getCachedIdTokenMetadata({ refreshCache: shouldRefresh })
    },
    {
      onError: (error) => logger.error('BCSCIdTokenProvider: Failed to load ID Token metadata', error as Error),
    }
  )

  useEffect(() => {
    load()
  }, [load])

  // Listen for token refresh events (e.g., tokens rebuilt after a failed startup
  // refresh) and reload from the freshly cached tokens without another refresh
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(BCSCEventTypes.TOKENS_REFRESHED, () => {
      logger.info('BCSCIdTokenProvider: Tokens refreshed, reloading ID token metadata')
      isInitialLoad.current = true
      refresh()
    })

    return () => subscription.remove()
  }, [refresh, logger])

  // If the load failed while offline, retry when connectivity returns
  useRetryOnReconnect(() => !data && !isLoading, refresh)

  const contextValue = useMemo(() => {
    return {
      isLoading: data ? false : isLoading,
      data: data ?? null,
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

  return { idToken: context.data, isLoading: context.isLoading, refreshIdToken: context.refreshData }
}
