import { runSystemChecks, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'
import useConfigApi from '../api/hooks/useConfigApi'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import {
  InternetStatusStackNavigation,
  InternetStatusSystemCheck,
} from '@/services/system-checks/InternetStatusSystemCheck'
import { createNavigationContainerRef, useNavigation } from '@react-navigation/native'

export enum SystemCheckScope {
  STARTUP = 'startup',
  MAIN_STACK = 'mainStack',
  LISTENER = 'listener',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: server status, internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
 *   - LISTENER: Checks that need to run as listeners for real-time updates ie: internet connectivity
 *
 * @param {SystemCheckScope[]} scopes - The scopes determining which checks to run.
 * @returns {void}
 */
export const useSystemChecks = (scopes: SystemCheckScope[]) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const [loading, setLoading] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<InternetStatusStackNavigation>()
  const startupCheckRef = useRef(false)
  const navigationRef = createNavigationContainerRef()

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    let removeInternetListener: NetInfoSubscription

    const asyncEffect = async () => {
      if (startupCheckRef.current || !navigationRef.isReady() || loading) {
        return
      }

      setLoading(true)
      startupCheckRef.current = true

      let systemChecks: SystemCheckStrategy[] = []

      const utils = { dispatch, translation: t, logger }

      // Listener checks
      if (scopes.includes(SystemCheckScope.LISTENER)) {
        removeInternetListener = NetInfo.addEventListener(async (netInfo) => {
          // Run internet connectivity check on network status change
          await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
        })
      }

      // Checks to run on app startup (root stack)
      if (scopes.includes(SystemCheckScope.STARTUP) && isClientReady && client) {
        systemChecks = [new ServerStatusSystemCheck(configApi.getServerStatus, utils)]
      }

      // Checks to run on main stack (verified users)
      if (scopes.includes(SystemCheckScope.MAIN_STACK) && isClientReady && client) {
        const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: true })
        systemChecks = [new DeviceCountSystemCheck(getIdToken, utils)]
      }

      try {
        await runSystemChecks(systemChecks)
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()

    return () => {
      if (removeInternetListener) {
        removeInternetListener()
      }
      startupCheckRef.current = false
    }
  }, [
    client,
    configApi.getServerStatus,
    dispatch,
    isClientReady,
    loading,
    logger,
    navigation,
    navigationRef,
    scopes,
    t,
    tokenApi,
  ])

  return { loading }
}
