import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCSCEventTypes } from '@/events/eventTypes'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, DeviceEventEmitter } from 'react-native'
import { useTokenService } from '../services/hooks/useTokenService'
import { useBCSCApiClientState } from './useBCSCApiClient'
import { useCreateSystemChecks } from './useCreateSystemChecks'

export enum SystemCheckScope {
  STARTUP = 'STARTUP',
  MAIN_STACK = 'MAIN_STACK',
  VERIFY = 'VERIFY',
  ACCOUNT = 'ACCOUNT',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
 *   - VERIFY: Checks that run within the verification flow (VerifyStack) for an unverified, authenticated user ie: expired verification session
 *
 * @param {SystemCheckScope} scope - The scope of the system checks to run
 * @returns Whether the scope has settled, i.e. its checks have finished running (or will never run).
 *   Callers that paint state the checks can change (see MainStack's loading gate) wait on this.
 */
export const useSystemChecks = (scope: SystemCheckScope): { hasSettled: boolean } => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const tokenService = useTokenService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const ranSystemChecksRef = useRef(false)
  const [hasRun, setHasRun] = useState(false)
  const systemChecks = useCreateSystemChecks()
  const appStateRef = useRef(AppState.currentState)
  const credentialMetadataRef = useRef(store.bcsc.credentialMetadata)
  const { emitAlert } = useErrorAlert()

  const utils = useMemo(() => ({ dispatch, translation: t, logger }), [dispatch, t, logger])

  // Updated credential metadata ref
  useEffect(() => {
    credentialMetadataRef.current = store.bcsc.credentialMetadata
  }, [store.bcsc.credentialMetadata])

  // Get system checks for the specified scope (useGetSystemChecks)
  const scopeSystemCheck = systemChecks[scope]

  // Internet connectivity and foreground listener
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

      // When app becomes active, refresh network state to ensure accurate connectivity status
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
        const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })

        await runSystemChecks(
          [new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation)],
          logger
        )
      } catch (error) {
        logger.error(`Device invalidation check failed after token refresh: ${(error as Error).message}`)
      }
    })

    return () => subscription.remove()
  }, [scope, isClientReady, client, utils, logger, navigation, emitAlert, tokenService])

  useEffect(() => {
    const runSystemChecksByScope = async () => {
      if (ranSystemChecksRef.current || !scopeSystemCheck.isReady) {
        // Only run if not already run and system checks for the scope are ready
        return
      }

      ranSystemChecksRef.current = true

      try {
        const systemCheckStrategies = await scopeSystemCheck.getSystemChecks()

        const results = await runSystemChecks(systemCheckStrategies, logger)

        const systemCheckResults = systemCheckStrategies.reduce<Record<string, boolean>>((acc, check, index) => {
          // Collect results for logging ie: { DeviceCountSystemCheck: true, AccountExpiryWarningSystemCheck: false }
          acc[check.constructor.name] = results[index]
          return acc
        }, {})

        logger.info(
          `[useSystemChecks]: Ran ${systemCheckStrategies.length} system checks on scope: ${scope}`,
          systemCheckResults
        )
      } catch (error) {
        logger.error(`[useSystemChecks]: Error running system checks for scope: ${scope}:`, error as Error)
      } finally {
        setHasRun(true)
      }
    }

    runSystemChecksByScope()
  }, [logger, scope, scopeSystemCheck])

  return useMemo(
    () => ({ hasSettled: hasRun || !scopeSystemCheck.isApplicable }),
    [hasRun, scopeSystemCheck.isApplicable]
  )
}
