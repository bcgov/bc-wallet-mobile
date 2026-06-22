import BCSCApiClient from '@/bcsc-theme/api/client'

import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { AccountExpirySystemCheck } from '@/services/system-checks/AccountExpirySystemCheck'
import { AccountRenewalSystemCheck } from '@/services/system-checks/AccountRenewalSystemCheck'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { ServerClockSkewSystemCheck } from '@/services/system-checks/ServerClockSkewSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { TermsOfUseSystemCheck } from '@/services/system-checks/TermsOfUseSystemCheck'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getMaxDevicesBannerLastDisplayedDate } from 'react-native-bcsc-core'
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
  const isVerified = Boolean(store.bcscSecure.verified)
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
      systemChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
    }

    return systemChecks
  }, [
    configApi,
    emitAlert,
    isBCServicesCardBundle,
    logger,
    navigation,
    store.bcsc.analyticsOptIn,
    store.developer.environment.analyticsAppId,
    utils,
  ])

  /**
   * Get system checks to run on main stack
   *
   * @returns Array of system check strategies
   */
  const getMainSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    // Guard the native call so a failure here cannot throw away the whole batch
    let dismissedAt: number | undefined
    try {
      dismissedAt = await getMaxDevicesBannerLastDisplayedDate()
    } catch {
      dismissedAt = undefined
    }
    const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })
    const updateRegistration = () =>
      registrationService.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, {
        // Automatic check: a transient keychain-unavailable failure retries on the
        // next launch (UPDATE_APP_VERSION only dispatches on success) — no modal.
        suppressTransientAlerts: true,
      })

    const systemChecks: SystemCheckStrategy[] = []

    // DeviceCount and EventReasonAlerts read the cached id token, which only exists
    // for verified users; calling getIdToken without one surfaces a user-facing
    // "token null" error (err 119). Gate them on verification so unverified users
    // still get the account-independent checks (Terms of Use) below.
    if (isVerified) {
      systemChecks.push(new DeviceCountSystemCheck(getIdToken, utils, dismissedAt))
    }

    // Account expiry is only meaningful once the account metadata has loaded, which
    // happens only for verified users. Include it conditionally so unverified users
    // still get the account-independent checks rather than the whole batch being
    // gated off when accountExpirationDate is undefined.
    if (accountExpirationDate) {
      systemChecks.push(new AccountExpirySystemCheck(accountExpirationDate, utils))
      systemChecks.push(new AccountRenewalSystemCheck(accountExpirationDate, utils))
    }

    if (isVerified) {
      systemChecks.push(new EventReasonAlertsSystemCheck(getIdToken, credentialMetadataRef.current, utils, navigation))
    }

    // Terms of Use applies to every user (the endpoint is public, no token needed)
    systemChecks.push(
      new TermsOfUseSystemCheck(
        () => configApi.getTermsOfUse(),
        store.bcsc.acceptedTermsOfUseVersion,
        navigation,
        utils
      )
      // TODO (ar/bm): v3 doesn't include the checks below; re-add if needed in future
      // AccountExpiryWarningAlertSystemCheck
      // AccountExpiryAlertSystemCheck
    )

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
    isVerified,
    utils,
    navigation,
    isBCServicesCardBundle,
    tokenService,
    registrationService,
    configApi,
    store.bcscSecure.registrationAccessToken,
    store.bcsc.selectedNickname,
    store.bcsc.appVersion,
    store.bcsc.appBuildNumber,
    store.bcsc.acceptedTermsOfUseVersion,
  ])

  return useMemo(() => {
    return {
      [SystemCheckScope.STARTUP]: {
        getSystemChecks: getStartupSystemChecks,
        isReady: Boolean(defaultReadiness && store.stateLoaded),
      },
      [SystemCheckScope.MAIN_STACK]: {
        getSystemChecks: getMainSystemChecks,
        // Not gated on accountExpirationDate: the batch runs for unverified users too,
        // and account-dependent checks are included conditionally in the builder.
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated),
      },
    }
  }, [defaultReadiness, getMainSystemChecks, getStartupSystemChecks, store.bcscSecure.isHydrated, store.stateLoaded])
}
