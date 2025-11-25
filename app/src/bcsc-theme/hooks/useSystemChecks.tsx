import { useEventListener } from '@/hooks/useEventListener'
import { AccountExpirySystemCheck } from '@/services/system-checks/AccountExpirySystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { DeviceInvalidatedSystemCheck } from '@/services/system-checks/DeviceInvalidatedSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks, SystemCheckNavigation, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { navigationRef } from 'App'
import { useContext, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getBundleId } from 'react-native-device-info'
import BCSCApiClient from '../api/client'
import useConfigApi from '../api/hooks/useConfigApi'
import useRegistrationApi from '../api/hooks/useRegistrationApi'
import useTokenApi from '../api/hooks/useTokens'
import { BCSCAccountContext } from '../contexts/BCSCAccountContext'
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
 * @returns {*} {void}
 */
export const useSystemChecks = (scope: SystemCheckScope) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const registrationApi = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const ranSystemChecksRef = useRef(false)
  const accountContext = useContext(BCSCAccountContext)

  const accountExpirationDate = accountContext?.account?.account_expiration_date

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

      const utils = { dispatch, translation: t, logger }
      const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

      try {
        // Checks to run once on app startup (root stack)
        if (scope === SystemCheckScope.STARTUP) {
          ranSystemChecksRef.current = true

          const serverStatus = await configApi.getServerStatus()

          const startupChecks: SystemCheckStrategy[] = [new ServerStatusSystemCheck(serverStatus, utils)]

          // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
          if (isBCServicesCardBundle) {
            startupChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
          }

          await runSystemChecks(startupChecks)
        }

        // Checks to run once on main stack (verified users)
        if (scope === SystemCheckScope.MAIN_STACK && accountExpirationDate) {
          ranSystemChecksRef.current = true

          const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })

          const startupChecks: SystemCheckStrategy[] = [
            new DeviceInvalidatedSystemCheck(getIdToken, navigation, utils),
            new DeviceCountSystemCheck(getIdToken, utils),
            new AccountExpirySystemCheck(accountExpirationDate, utils),
          ]

          // Only run device registration update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
          if (isBCServicesCardBundle) {
            startupChecks.push(
              new UpdateDeviceRegistrationSystemCheck(store.bcsc, registrationApi.updateRegistration, utils)
            )
          }

          await runSystemChecks(startupChecks)
        }
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      }
    }

    runChecksByScope()
  }, [
    accountExpirationDate,
    client,
    configApi,
    dispatch,
    isClientReady,
    logger,
    registrationApi.updateRegistration,
    scope,
    store.bcsc,
    t,
    tokenApi,
  ])
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
