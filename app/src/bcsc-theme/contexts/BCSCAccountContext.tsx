import { navigationRef } from '@/contexts/NavigationContainerContext'
import { isAppError } from '@/errors/appError'
import { ACCOUNT_EXPIRATION_DATE_FORMAT } from '@/constants'
import { BCSCEventTypes } from '@/events/eventTypes'
import { BCSCSecureState, BCState, VerificationStatus } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import moment from 'moment'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native'
import { UserInfoResponseData } from '../api/hooks/useUserApi'
import useDataLoader from '../hooks/useDataLoader'
import { ReconnectEvent, useRetryOnReconnect } from '../hooks/useRetryOnReconnect'
import { useUserService } from '../services/hooks/useUserService'
import { formatAccountName } from '../utils/account-utils'
import { isUserVerified } from '../utils/bcsc-credential'

export interface BCSCAccount extends Omit<UserInfoResponseData, 'picture'> {
  picture: string | null // URI to the user's profile picture
  fullname_formatted: string // Brule, Steve
  account_expiration_date: Date // equivalent to card_expiry but as Date
}

export interface BCSCAccountContextType {
  account: BCSCAccount | null
  isLoadingAccount: boolean
  refreshAccount: () => void
}

/** What initiated an account load, captured for diagnostics on failure (see #4675). */
export type AccountLoadTrigger = 'initial' | 'tokens-refreshed' | 'reconnect' | 'manual'

export interface AccountLoadDiagnostics {
  trigger: AccountLoadTrigger
  screen: string | undefined
  navigationReady: boolean
  appState: AppStateStatus
  connectivity?: ReconnectEvent
  verified: boolean
  verifiedStatus: VerificationStatus
  /** Never the token value itself - only whether one exists. */
  hasRefreshToken: boolean
}

const buildAccountLoadDiagnostics = (
  trigger: AccountLoadTrigger,
  secureState: BCSCSecureState,
  connectivity?: ReconnectEvent
): AccountLoadDiagnostics => ({
  trigger,
  screen: navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined,
  navigationReady: navigationRef.isReady(),
  appState: AppState.currentState,
  ...(connectivity ? { connectivity } : {}),
  verified: isUserVerified(secureState),
  verifiedStatus: secureState.verifiedStatus,
  hasRefreshToken: Boolean(secureState.refreshToken),
})

export const BCSCAccountContext = createContext<BCSCAccountContextType | null>(null)

/**
 * Provides the BCSCAccountContext to child components, managing the loading of user account data.
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {React.ReactElement} The BCSCAccountProvider component wrapping its children.
 */
export const BCSCAccountProvider = ({ children }: PropsWithChildren) => {
  const userService = useUserService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()

  // Set synchronously just before each load starts, so the diagnostics snapshot reflects
  // state at load time even though useDataLoader's setIsLoading(true) hasn't re-rendered yet.
  const pendingLoadRef = useRef<{ trigger: AccountLoadTrigger; connectivity?: ReconnectEvent }>({
    trigger: 'initial',
  })
  const lastLoadRef = useRef<AccountLoadDiagnostics | null>(null)

  const loadUserMetadata = useCallback(() => {
    const diagnostics = buildAccountLoadDiagnostics(
      pendingLoadRef.current.trigger,
      store.bcscSecure,
      pendingLoadRef.current.connectivity
    )
    lastLoadRef.current = diagnostics
    logger.info('BCSCAccountProvider: Loading account', diagnostics)
    return userService.getUserMetadata()
  }, [logger, store.bcscSecure, userService])

  const { data, load, isLoading, refresh } = useDataLoader(loadUserMetadata, {
    onError: (error) => {
      const accountLoad = lastLoadRef.current
      if (isAppError(error)) {
        error.addContext({ accountLoad })
      }
      logger.error('BCSCAccountProvider: Failed to load user metadata', { error, accountLoad })
    },
  })

  const canLoadAccount = isUserVerified(store.bcscSecure)

  const startAccountLoad = useCallback(
    (trigger: AccountLoadTrigger, connectivity?: ReconnectEvent) => {
      if (!canLoadAccount) {
        logger.info('BCSCAccountProvider: Skipping account load for unverified user', { trigger })
        return
      }

      pendingLoadRef.current = { trigger, connectivity }

      if (trigger === 'initial') {
        load()
      } else {
        refresh()
      }
    },
    [canLoadAccount, load, logger, refresh]
  )

  useEffect(() => {
    startAccountLoad('initial')
  }, [startAccountLoad])

  // Listen for token refresh events (e.g., from FCM status notifications) and refresh account data
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(BCSCEventTypes.TOKENS_REFRESHED, () => {
      logger.info('BCSCAccountProvider: Tokens refreshed, reloading account data')
      startAccountLoad('tokens-refreshed')
    })

    return () => subscription.remove()
  }, [startAccountLoad, logger])

  // If the load failed while offline, retry when connectivity returns
  useRetryOnReconnect(
    () => !data && !isLoading,
    (event) => startAccountLoad('reconnect', event)
  )

  const refreshAccount = useCallback(() => startAccountLoad('manual'), [startAccountLoad])

  const accountContextValue = useMemo(() => {
    if (!data) {
      return {
        account: null,
        isLoadingAccount: isLoading,
        refreshAccount,
      }
    }

    const formattedName = formatAccountName({
      firstName: data.user.given_names, // ie: "Steve John"
      lastName: data.user.family_name, // ie: "Brule"
    }) // => "Brule, Steve John"

    return {
      account: {
        ...data.user,
        picture: data.picture ?? null,
        fullname_formatted: formattedName,
        account_expiration_date: moment(data.user.card_expiry, ACCOUNT_EXPIRATION_DATE_FORMAT).toDate(),
      },
      isLoadingAccount: false,
      refreshAccount,
    }
  }, [data, isLoading, refreshAccount])

  return <BCSCAccountContext.Provider value={accountContextValue}>{children}</BCSCAccountContext.Provider>
}

/**
 * Hook to access the BCSC account context.
 *
 * @returns The account or null if loading
 */
export const useAccount = () => {
  const context = useContext(BCSCAccountContext)

  if (!context) {
    throw new Error('useAccount must be used within a BCSCAccountProvider')
  }

  return context
}
