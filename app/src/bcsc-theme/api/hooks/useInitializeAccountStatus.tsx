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
  const [hasCheckedAccount, setHasCheckedAccount] = useState(Boolean(store.bcsc.hasAccount))

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

      dispatch({ type: BCDispatchAction.SET_HAS_ACCOUNT, payload: [Boolean(account)] })

      const nickname = account?.nickname || account?.displayName

      if (nickname && !store.bcsc.nicknames.includes(nickname)) {
        dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [nickname] })
      }
    } catch (error) {
      logger.error('[useInitializeAccountStatus] Error checking for existing account:', error as Error)
    } finally {
      setHasCheckedAccount(true)
    }
  }, [dispatch, logger, store.bcsc.nicknames])

  useEffect(() => {
    if (!store.stateLoaded || hasCheckedAccount) {
      return
    }

    if (store.bcsc.hasAccount) {
      setHasCheckedAccount(true)
      return
    }

    initializeAccountStatus()
  }, [hasCheckedAccount, initializeAccountStatus, store.bcsc.hasAccount, store.stateLoaded])

  return {
    initializingAccount,
  }
}
