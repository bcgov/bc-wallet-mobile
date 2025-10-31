import { runSystemChecks } from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'
import useConfigApi from '../api/hooks/useConfigApi'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import NetInfo from '@react-native-community/netinfo'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import {
  InternetStatusStackNavigation,
  InternetStatusSystemCheck,
} from '@/services/system-checks/InternetStatusSystemCheck'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { useEventListener } from '@/hooks/useEventListener'

export enum SystemCheckScope {
  STARTUP = 'startup',
  MAIN_STACK = 'mainStack',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: server status, internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
 *
 * @param {SystemCheckScope[]} scope - The scope of system checks to run.
 * @returns {void}
 */
export const useSystemChecks = (scope: SystemCheckScope) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<InternetStatusStackNavigation>()
  const isNavigationReady = useNavigationState((state) => Boolean(state))
  const startupCheckRef = useRef(false)
  // Startup: Internet connectivity listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
    })
  }, scope === SystemCheckScope.STARTUP && isNavigationReady)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    const runChecksByScope = async () => {
      if (startupCheckRef.current || !isClientReady || !client) {
        return
      }

      startupCheckRef.current = true

      const utils = { dispatch, translation: t, logger }

      try {
        // Checks to run once on app startup (root stack)
        if (scope === SystemCheckScope.STARTUP) {
          await runSystemChecks([new ServerStatusSystemCheck(configApi.getServerStatus, utils)])
        }

        // Checks to run once on main stack (verified users)
        if (scope === SystemCheckScope.MAIN_STACK) {
          const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })
          await runSystemChecks([new DeviceCountSystemCheck(getIdToken, utils)])
        }
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      } finally {
        startupCheckRef.current = false
      }
    }

    runChecksByScope()
  }, [
    client,
    configApi.getServerStatus,
    dispatch,
    isClientReady,
    isNavigationReady,
    logger,
    navigation,
    scope,
    t,
    tokenApi,
  ])
}
