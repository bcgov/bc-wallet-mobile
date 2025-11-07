import { useEventListener } from '@/hooks/useEventListener'
import { CardExpirySystemCheck } from '@/services/system-checks/CardExpirySystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import {
  InternetStatusStackNavigation,
  InternetStatusSystemCheck,
} from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { navigationRef } from 'App'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import BCSCApiClient from '../api/client'
import useConfigApi from '../api/hooks/useConfigApi'
import useTokenApi from '../api/hooks/useTokens'
import useUserApi from '../api/hooks/useUserApi'
import { useBCSCApiClientState } from './useBCSCApiClient'

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
 * @param {SystemCheckScope} scope - The scope of the system checks to run
 * @returns {void}
 */
export const useSystemChecks = (scope: SystemCheckScope) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const userApi = useUserApi(client as BCSCApiClient)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<InternetStatusStackNavigation>()
  const ranSystemChecksRef = useRef(false)

  // Internet connectivity event listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      // On connectivity change, wait for navigation to be ready before running the check
      const navigationReady = await _waitForNavigationToBeReady()

      if (navigationReady) {
        await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
      }
    })
  }, scope === SystemCheckScope.STARTUP)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    const runChecksByScope = async () => {
      if (ranSystemChecksRef.current || !isClientReady || !client) {
        return
      }

      ranSystemChecksRef.current = true

      const utils = { dispatch, translation: t, logger }

      try {
        // Checks to run once on app startup (root stack)
        if (scope === SystemCheckScope.STARTUP) {
          await runSystemChecks([new ServerStatusSystemCheck(configApi.getServerStatus, utils)])
        }

        // Checks to run once on main stack (verified users)
        if (scope === SystemCheckScope.MAIN_STACK) {
          const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })

          const userInfo = await userApi.getUserInfo()
          const cardExpiry = new Date(userInfo.card_expiry)

          await runSystemChecks([
            new DeviceCountSystemCheck(getIdToken, utils),
            new CardExpirySystemCheck(cardExpiry, utils),
          ])
        }
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      }
    }

    runChecksByScope()
  }, [client, configApi.getServerStatus, dispatch, isClientReady, logger, scope, t, tokenApi, userApi])
}

/**
 * Waits for the navigation to be mounted and ready.
 *
 * @returns {Promise<true>} A promise that resolves to true when navigation is ready.
 */
const _waitForNavigationToBeReady = (): Promise<true> => {
  return new Promise((resolve) => {
    if (navigationRef.current?.getRootState()) {
      resolve(true)
    }

    const interval = setInterval(() => {
      if (navigationRef.current?.getRootState()) {
        clearInterval(interval)
        resolve(true)
      }
    }, 10)
  })
}
