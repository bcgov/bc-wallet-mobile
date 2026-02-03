import { BCSCEventTypes } from '@/events/eventTypes'
import { useEventListener } from '@/hooks/useEventListener'
import { DeviceInvalidatedSystemCheck } from '@/services/system-checks/DeviceInvalidatedSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'
import { useBCSCApiClientState } from './useBCSCApiClient'
import { useGetSystemChecks } from './useGetSystemChecks'

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
  const [, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const ranSystemChecksRef = useRef(false)

  const systemChecks = useGetSystemChecks()

  // Get system checks for the specified scope (useGetSystemChecks)
  const scopeSystemCheck = systemChecks[scope]

  // Internet connectivity event listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
    })
  }, scope === SystemCheckScope.STARTUP)

  // Listen for token refresh events (e.g., from FCM status notifications) and run device invalidation check
  useEffect(() => {
    if (scope !== SystemCheckScope.MAIN_STACK || !isClientReady || !client) {
      return
    }

    const subscription = DeviceEventEmitter.addListener(BCSCEventTypes.TOKENS_REFRESHED, async () => {
      logger.info('useSystemChecks: Tokens refreshed, running device invalidation check')

      try {
        const utils = { dispatch, translation: t, logger }

        // Tokens have already been refreshed before this event; use refreshCache: false
        // to reuse the freshly updated ID token from cache without forcing another refresh.
        const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })

        await runSystemChecks([new DeviceInvalidatedSystemCheck(getIdToken, navigation, utils)])
      } catch (error) {
        logger.error(`Device invalidation check failed after token refresh: ${(error as Error).message}`)
      }
    })

    return () => subscription.remove()
  }, [scope, isClientReady, client, tokenApi, dispatch, t, logger, navigation])

  useEffect(() => {
    const runSystemChecksByScope = async () => {
      if (ranSystemChecksRef.current || !scopeSystemCheck.isReady) {
        return
      }

      if (!scopeSystemCheck) {
        logger.warn(`[useSystemChecks]: No system checks defined for scope: ${scope}`)
        return
      }

      ranSystemChecksRef.current = true

      try {
        const systemCheckStrategies = await scopeSystemCheck.getSystemChecks()

        logger.info(`[useSystemChecks]: Running ${systemCheckStrategies.length} system checks for scope: ${scope}`)

        await runSystemChecks(systemCheckStrategies)
      } catch (error) {
        logger.error(`[useSystemChecks]: Error running system checks for scope: ${scope}:`, error as Error)
      }
    }

    runSystemChecksByScope()
  }, [logger, scope, scopeSystemCheck])
}
