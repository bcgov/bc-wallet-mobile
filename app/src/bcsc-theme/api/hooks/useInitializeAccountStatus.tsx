import { retryAsync } from '@/bcsc-theme/utils/retry'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useEffect, useState } from 'react'
import { getAccount } from 'react-native-bcsc-core'

const ACCOUNT_FETCH_MAX_RETRIES = 3
const ACCOUNT_FETCH_RETRY_DELAY_MS = 500

/**
 * Hook to initialize the account status in the global store on app startup.
 *
 * @returns An object containing the initializingAccount boolean which indicates if the account status is being initialized.
 */
export const useInitializeAccountStatus = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  // "Checked" means fully initialized: an account is known AND its nickname is present.
  // Mirrors the useEffect's early-return condition below so a store that's already
  // hydrated (hasAccount true) but missing its nickname still runs the self-heal.
  const [hasCheckedAccount, setHasCheckedAccount] = useState(
    Boolean(store.bcsc.hasAccount) && Boolean(store.bcsc.selectedNickname?.trim())
  )

  const initializingAccount = store.stateLoaded && !hasCheckedAccount

  /**
   * Checks for an existing BCSC account and updates the global store accordingly.
   * Note: Will try to fetch the account multiple times with a delay in case of transient errors
   *
   * @returns Promise that resolves when the account status has been initialized
   */
  const initializeAccountStatus = useCallback(async () => {
    try {
      // TEMP (MD): Patch until BcscCore package correctly bubbles errors https://github.com/bcgov/bc-wallet-mobile/issues/3372
      const account = await retryAsync(getAccount, ACCOUNT_FETCH_MAX_RETRIES, ACCOUNT_FETCH_RETRY_DELAY_MS, true)

      // Preserve existing semantics: never downgrade a persisted hasAccount=true
      // on a transient native read failure (see #3405 verification-loop fix)
      if (!store.bcsc.hasAccount) {
        dispatch({ type: BCDispatchAction.SET_HAS_ACCOUNT, payload: [Boolean(account)] })
      }

      // Self-heal: the AsyncStorage nickname can be lost on process death (e.g. Android
      // killing the app after phone lock); the native account record is durable secure
      // storage. displayName fallback covers v3 ias-ios migrated users. See #4258.
      const nativeNickname = account?.nickname?.trim() || account?.displayName?.trim()
      if (nativeNickname && !store.bcsc.selectedNickname?.trim()) {
        logger.info('[useInitializeAccountStatus] Restoring nickname from native account record')
        dispatch({ type: BCDispatchAction.UPDATE_NICKNAME, payload: [nativeNickname] })
      }
    } catch (error) {
      logger.error('[useInitializeAccountStatus] Error checking for existing account:', error as Error)
    } finally {
      setHasCheckedAccount(true)
    }
  }, [dispatch, logger, store.bcsc.hasAccount, store.bcsc.selectedNickname])

  useEffect(() => {
    if (!store.stateLoaded || hasCheckedAccount) {
      return
    }

    if (store.bcsc.hasAccount && store.bcsc.selectedNickname?.trim()) {
      setHasCheckedAccount(true)
      return
    }

    initializeAccountStatus()
  }, [
    hasCheckedAccount,
    initializeAccountStatus,
    store.bcsc.hasAccount,
    store.bcsc.selectedNickname,
    store.stateLoaded,
  ])

  return {
    initializingAccount,
  }
}
