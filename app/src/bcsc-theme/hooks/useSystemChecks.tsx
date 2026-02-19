import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCSCEventTypes } from '@/events/eventTypes'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, DeviceEventEmitter } from 'react-native'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'
import { useBCSCApiClientState } from './useBCSCApiClient'
import { useCreateSystemChecks } from './useCreateSystemChecks'

export enum SystemCheckScope {
  STARTUP = 'STARTUP',
  MAIN_STACK = 'MAIN_STACK',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: server status, internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
 *
 * @param {SystemCheckScope} scope - The scope of the system checks to run
 * @returns {*} {void}
 */
export const useSystemChecks = (scope: SystemCheckScope) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const ranSystemChecksRef = useRef(false)
  const systemChecks = useCreateSystemChecks()
  const appStateRef = useRef(AppState.currentState)
  const credentialMetadataRef = useRef(store.bcsc.credentialMetadata)
  const { emitAlert } = useErrorAlert()

  // Get system checks for the specified scope (useGetSystemChecks)
  const scopeSystemCheck = systemChecks[scope]

  // Internet connectivity listener
  useEffect(() => {
    if (scope !== SystemCheckScope.STARTUP) {
      return
    }

    const unsubscribeNetInfo = NetInfo.addEventListener(async ({ isConnected, isInternetReachable }) => {
      // false negatives on iOS happen when app is in background/suspended state
      if (appStateRef.current !== 'active') {
        return
      }

      await runSystemChecks([new InternetStatusSystemCheck(isConnected, isInternetReachable, navigation, logger)])
    })

    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      appStateRef.current = nextAppState

      // When app becomes active, refresh network state to ensure accurate status
      if (nextAppState === 'active') {
        const { isConnected, isInternetReachable } = await NetInfo.refresh()
        await runSystemChecks([new InternetStatusSystemCheck(isConnected, isInternetReachable, navigation, logger)])
      }
    })

    return () => {
      unsubscribeNetInfo()
      appStateSubscription.remove()
    }
  }, [scope, logger, navigation])

  // Listen for token refresh events (e.g., from FCM status notifications) and run device invalidation check
  useEffect(() => {
    if (scope !== SystemCheckScope.MAIN_STACK || !isClientReady || !client) {
      return
    }

    const subscription = DeviceEventEmitter.addListener(BCSCEventTypes.TOKENS_REFRESHED, async () => {
      logger.info('useSystemChecks: Tokens refreshed, running event reason alerts system check')

      try {
        const utils = { dispatch, translation: t, logger }

        // Tokens have already been refreshed before this event; use refreshCache: false
        // to reuse the freshly updated ID token from cache without forcing another refresh.
        const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })

        await runSystemChecks([
          new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation),
        ])
      } catch (error) {
        logger.error(`Device invalidation check failed after token refresh: ${(error as Error).message}`)
      }
    })

    return () => subscription.remove()
  }, [scope, isClientReady, client, tokenApi, dispatch, t, logger, navigation, emitAlert])

  useEffect(() => {
    const runSystemChecksByScope = async () => {
      if (ranSystemChecksRef.current || !scopeSystemCheck.isReady) {
        // Only run if not already run and system checks for the scope are ready
        return
      }

      ranSystemChecksRef.current = true

      try {
        const systemCheckStrategies = await scopeSystemCheck.getSystemChecks()

        const results = await runSystemChecks(systemCheckStrategies)

        const systemCheckResults = systemCheckStrategies.reduce<Record<string, boolean>>((acc, check, index) => {
          // Collect results for logging ie: { DeviceCountSystemCheck: true, AccountExpiryWarningBannerSystemCheck: false }
          acc[check.constructor.name] = results[index]
          return acc
        }, {})

        logger.info(
          `[useSystemChecks]: Ran ${systemCheckStrategies.length} system checks on scope: ${scope}`,
          systemCheckResults
        )
      } catch (error) {
        logger.error(`[useSystemChecks]: Error running system checks for scope: ${scope}:`, error as Error)
      }
    }

    runSystemChecksByScope()
  }, [logger, scope, scopeSystemCheck])
}
