import BCSCApiClient from '@/bcsc-theme/api/client'

import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { AccountExpiryWarningBannerSystemCheck } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { ServerClockSkewSystemCheck } from '@/services/system-checks/ServerClockSkewSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { VerificationSessionExpiredSystemCheck } from '@/services/system-checks/VerificationSessionExpiredSystemCheck'
import { BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAuthorizationRequest, getMaxDevicesBannerLastDisplayedDate } from 'react-native-bcsc-core'
import { getBundleId } from 'react-native-device-info'
import { SystemCheckStrategy } from '../../services/system-checks/system-checks'
import useConfigApi from '../api/hooks/useConfigApi'
import { BCSCAccountContext } from '../contexts/BCSCAccountContext'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useTokenService } from '../services/hooks/useTokenService'
import { SystemCheckScope } from './useSystemChecks'

const BCSC_BUILD_SUFFIX = '.servicescard'

type UseGetSystemChecksReturn = Record<
  SystemCheckScope,
  {
    /**
     * Callback to get system checks for the scope
     * @return Array of system check strategies
     */
    getSystemChecks: () => Promise<SystemCheckStrategy[]>
    /**
     * Indicates if the system checks for the scope are ready to be run
     */
    isReady: boolean
  }
>

/**
 * Hook to create system checks to be used by useSystemChecks hook.
 *
 * @see useSystemChecks.tsx
 *
 * @returns Object containing system check getters and readiness for each scope
 */
export const useCreateSystemChecks = (): UseGetSystemChecksReturn => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenService = useTokenService()
  const registrationService = useRegistrationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const { isNavigationReady } = useNavigationContainer()
  const accountContext = useContext(BCSCAccountContext)
  const { emitAlert } = useErrorAlert()
  const credentialMetadataRef = useRef(store.bcsc.credentialMetadata)
  const utils = useMemo(() => ({ dispatch, translation: t, logger }), [dispatch, logger, t])

  const defaultReadiness = isNavigationReady && client && isClientReady
  const accountExpirationDate = accountContext?.account?.account_expiration_date
  const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

  // update credential metadata ref on store change
  useEffect(() => {
    credentialMetadataRef.current = store.bcsc.credentialMetadata
  }, [store.bcsc.credentialMetadata])

  /**
   * Get system checks to run at app startup
   *
   * @returns Array of system check strategies
   */
  const getStartupSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    // Server status banners are not cleared on startup so they persist across app restarts
    // and remain visible for VPN users who bypass the blocking outage modal.

    const serverStatus = await configApi.getServerStatus()

    const systemChecks: SystemCheckStrategy[] = [
      new AnalyticsSystemCheck(
        store.bcsc.analyticsOptIn,
        store.developer.environment.analyticsAppId,
        Analytics,
        logger
      ),
      new ServerStatusSystemCheck(serverStatus, utils, navigation),
      new ServerClockSkewSystemCheck(serverStatus.serverTimestamp, new Date(), emitAlert, utils),
    ]

    // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
    if (isBCServicesCardBundle) {
      systemChecks.push(
        new UpdateAppSystemCheck(serverStatus, navigation, utils),
        // Detect an expired in-progress verification session (device_code TTL ~7 days). Read the expiry
        // from native storage rather than the store, since startup checks can run before secure state
        // is hydrated (see isReady below — it does not gate on store.bcscSecure.isHydrated).
        new VerificationSessionExpiredSystemCheck(
          async () => {
            const authRequest = await getAuthorizationRequest()
            if (!authRequest?.deviceCode || !authRequest.expiry) {
              return null
            }
            return new Date(authRequest.expiry * 1000)
          },
          isUserVerified(store.bcscSecure),
          navigation,
          utils
        )
      )
    }

    return systemChecks
  }, [
    configApi,
    emitAlert,
    isBCServicesCardBundle,
    logger,
    navigation,
    store.bcsc.analyticsOptIn,
    store.bcscSecure,
    store.developer.environment.analyticsAppId,
    utils,
  ])

  /**
   * Get system checks to run on main stack
   *
   * @returns Array of system check strategies
   */
  const getMainSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    if (!accountExpirationDate) {
      throw new Error('Account expiration date undefined. Did you forget to check isReady?')
    }

    const dismissedAt = await getMaxDevicesBannerLastDisplayedDate()
    const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })
    const updateRegistration = () =>
      registrationService.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, {
        // Automatic check: a transient keychain-unavailable failure retries on the
        // next launch (UPDATE_APP_VERSION only dispatches on success) — no modal.
        suppressTransientAlerts: true,
      })

    const systemChecks: SystemCheckStrategy[] = [
      new DeviceCountSystemCheck(getIdToken, utils, dismissedAt),
      new AccountExpiryWarningBannerSystemCheck(accountExpirationDate, utils),
      new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation),
      // TODO (ar/bm): v3 doesn't include the checks below; re-add if needed in future
      // AccountExpiryWarningAlertSystemCheck
      // AccountExpiryAlertSystemCheck
    ]

    // Only run device registration update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
    if (isBCServicesCardBundle) {
      systemChecks.push(
        new UpdateDeviceRegistrationSystemCheck(
          store.bcsc.appVersion,
          store.bcsc.appBuildNumber,
          updateRegistration,
          utils
        )
      )
    }
    return systemChecks
  }, [
    accountExpirationDate,
    utils,
    emitAlert,
    navigation,
    isBCServicesCardBundle,
    tokenService,
    registrationService,
    store.bcscSecure.registrationAccessToken,
    store.bcsc.selectedNickname,
    store.bcsc.appVersion,
    store.bcsc.appBuildNumber,
  ])

  return useMemo(() => {
    return {
      [SystemCheckScope.STARTUP]: {
        getSystemChecks: getStartupSystemChecks,
        isReady: Boolean(defaultReadiness && store.stateLoaded),
      },
      [SystemCheckScope.MAIN_STACK]: {
        getSystemChecks: getMainSystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated && accountExpirationDate),
      },
    }
  }, [
    accountExpirationDate,
    defaultReadiness,
    getMainSystemChecks,
    getStartupSystemChecks,
    store.bcscSecure.isHydrated,
    store.stateLoaded,
  ])
}
