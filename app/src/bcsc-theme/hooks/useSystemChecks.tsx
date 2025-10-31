import { runSystemChecks } from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import { navigationRef } from 'App'

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
  const startupCheckRef = useRef(false)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    let removeInternetListener: NetInfoSubscription

    const asyncEffect = async () => {
      if (startupCheckRef.current || !navigationRef.isReady()) {
        return
      }

      startupCheckRef.current = true

      const utils = { dispatch, translation: t, logger }

      try {
        // Checks to run as listeners
        if (scope === SystemCheckScope.LISTENER) {
          removeInternetListener = NetInfo.addEventListener(async (netInfo) => {
            // Run internet connectivity check on network status change
            await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
          })
        }

        // Checks to run on app startup (root stack)
        if (scope === SystemCheckScope.STARTUP && isClientReady && client) {
          await runSystemChecks([new ServerStatusSystemCheck(configApi.getServerStatus, utils)])
        }

        // Checks to run on main stack (verified users)
        if (scope === SystemCheckScope.MAIN_STACK && isClientReady && client) {
          const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: true })
          await runSystemChecks([new DeviceCountSystemCheck(getIdToken, utils)])
        }
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      } finally {
        startupCheckRef.current = false
      }
    }

    asyncEffect()

    return () => {
      removeInternetListener?.()
    }
  }, [client, configApi.getServerStatus, dispatch, isClientReady, logger, navigation, scope, t, tokenApi])
}
