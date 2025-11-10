import { useEventListener } from '@/hooks/useEventListener'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks, SystemCheckNavigation, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { navigationRef } from 'App'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getBundleId } from 'react-native-device-info'
import BCSCApiClient from '../api/client'
import useConfigApi from '../api/hooks/useConfigApi'
import useTokenApi from '../api/hooks/useTokens'
import { useBCSCApiClientState } from './useBCSCApiClient'

const BCSC_BUILD_SUFFIX = '.servicescard'

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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const ranSystemChecksRef = useRef(false)

  // Internet connectivity event listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      const navigation = await getSystemCheckNavigation()

      await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
    })
  }, scope === SystemCheckScope.STARTUP)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    const runChecksByScope = async () => {
      const navigation = await getSystemCheckNavigation()

      if (ranSystemChecksRef.current || !isClientReady || !client || !navigation) {
        return
      }

      ranSystemChecksRef.current = true

      const utils = { dispatch, translation: t, logger }

      try {
        // Checks to run once on app startup (root stack)
        if (scope === SystemCheckScope.STARTUP) {
          const serverStatus = await configApi.getServerStatus()

          const startupChecks: SystemCheckStrategy[] = [new ServerStatusSystemCheck(serverStatus, utils)]

          const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

          // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
          if (isBCServicesCardBundle) {
            startupChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
          }

          await runSystemChecks(startupChecks)
        }

        // Checks to run once on main stack (verified users)
        if (scope === SystemCheckScope.MAIN_STACK) {
          const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })

          await runSystemChecks([new DeviceCountSystemCheck(getIdToken, utils)])
        }
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      }
    }

    runChecksByScope()
  }, [client, configApi, dispatch, isClientReady, logger, scope, t, tokenApi])
}

/**
 * Waits for the navigation to be mounted and ready.
 *
 * Note: This will time out after MAX_WAIT_MS to prevent hanging indefinitely.
 *
 * @throws {Error} If navigation does not become ready within the maximum wait time.
 * @returns {Promise<true>} A promise that resolves to true when navigation is ready.
 */
const _waitForNavigationToBeReady = (): Promise<true> => {
  const MAX_WAIT_MS = 5000 // Question: Is this timeout reasonable?

  return new Promise((resolve, reject) => {
    if (navigationRef.isReady() && navigationRef.getRootState()) {
      resolve(true)
    }

    const startTime = Date.now()

    const interval = setInterval(() => {
      if (navigationRef.isReady() && navigationRef.getRootState()) {
        clearInterval(interval)
        resolve(true)
      }

      // Prevent waiting indefinitely, timeout after MAX_WAIT_MS
      if (Date.now() - startTime >= MAX_WAIT_MS) {
        clearInterval(interval)
        return reject(new Error('Navigation did not become ready...'))
      }
    }, 10)
  })
}

/**
 * Waits for navigation to be ready and returns the navigation interface stub for system checks.
 *
 * @returns {Promise<SystemCheckNavigation>} A promise that resolves to the system check navigation interface.
 */
const getSystemCheckNavigation = async (): Promise<SystemCheckNavigation> => {
  await _waitForNavigationToBeReady()

  return {
    navigate: navigationRef.navigate,
    canGoBack: navigationRef.canGoBack,
    goBack: navigationRef.goBack,
    getState: navigationRef.getState,
  }
}
