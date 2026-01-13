import { navigationRef } from '@/contexts/NavigationContainerContext'
import { BCSCEventTypes } from '@/events/eventTypes'
import { useEventListener } from '@/hooks/useEventListener'
import { AccountExpiryWarningBannerSystemCheck } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { DeviceInvalidatedSystemCheck } from '@/services/system-checks/DeviceInvalidatedSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks, SystemCheckNavigation, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import moment from 'moment'
import { useContext, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'
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

  const accountExpirationDate = moment(new Date()).subtract(5, 'days').toDate() //accountContext?.account?.account_expiration_date

  // Internet connectivity event listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      const navigation = await getSystemCheckNavigation()

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
        const navigation = await getSystemCheckNavigation()
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
  }, [scope, isClientReady, client, tokenApi, dispatch, t, logger])

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

          const startupChecks: SystemCheckStrategy[] = [
            new AnalyticsSystemCheck(store.bcsc.analyticsOptIn, Analytics, logger),
            new ServerStatusSystemCheck(serverStatus, utils),
          ]

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
          const updateRegistration = () =>
            registrationApi.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname)
          const startupChecks: SystemCheckStrategy[] = [
            new DeviceInvalidatedSystemCheck(getIdToken, navigation, utils),
            new DeviceCountSystemCheck(getIdToken, utils),
            new AccountExpiryWarningBannerSystemCheck(accountExpirationDate, utils, navigation),
            // new AccountExpiryWarningAlertSystemCheck(
            //   accountExpirationDate,
            //   Boolean(store.bcsc.hasDismissedExpiryAlert),
            //   utils,
            //   navigation
            // ),
            // new AccountExpiryAlertSystemCheck(accountExpirationDate, navigation),
          ]

          // Only run device registration update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
          if (isBCServicesCardBundle) {
            startupChecks.push(
              new UpdateDeviceRegistrationSystemCheck(store.bcsc.appVersion, updateRegistration, utils)
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
    registrationApi,
    registrationApi.updateRegistration,
    scope,
    store.bcsc.appVersion,
    store.bcsc.selectedNickname,
    store.bcsc.analyticsOptIn,
    store.bcscSecure.registrationAccessToken,
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
