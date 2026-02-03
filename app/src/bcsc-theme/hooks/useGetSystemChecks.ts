import BCSCApiClient from '@/bcsc-theme/api/client'
import useTokenApi from '@/bcsc-theme/api/hooks/useTokens'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { AccountExpiryWarningBannerSystemCheck } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { DeviceInvalidatedSystemCheck } from '@/services/system-checks/DeviceInvalidatedSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getBundleId } from 'react-native-device-info'
import { SystemCheckStrategy } from '../../services/system-checks/system-checks'
import useConfigApi from '../api/hooks/useConfigApi'
import useRegistrationApi from '../api/hooks/useRegistrationApi'
import { BCSCAccountContext } from '../contexts/BCSCAccountContext'
import { SystemCheckScope } from './useSystemChecks'

const BCSC_BUILD_SUFFIX = '.servicescard'

/**
 * Hook to get system checks for different app scopes and their readiness.
 *
 * @returns Object containing system check getters and readiness for each scope
 */
export const useGetSystemChecks = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const registrationApi = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const { isNavigationReady } = useNavigationContainer()
  const accountContext = useContext(BCSCAccountContext)
  const utils = useMemo(() => ({ dispatch, translation: t, logger }), [dispatch, logger, t])

  const defaultReadiness = isNavigationReady && client && isClientReady
  const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

  /**
   * Get system checks to run at app startup
   *
   * @returns Array of system check strategies
   */
  const getStartupSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    const serverStatus = await configApi.getServerStatus()

    const systemChecks: SystemCheckStrategy[] = [
      new AnalyticsSystemCheck(store.bcsc.analyticsOptIn, Analytics, logger),
      new ServerStatusSystemCheck(serverStatus, utils),
    ]

    // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
    if (isBCServicesCardBundle) {
      systemChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
    }

    return systemChecks
  }, [configApi, isBCServicesCardBundle, logger, navigation, store.bcsc.analyticsOptIn, utils])

  /**
   * Get system checks to run on main stack
   *
   * @returns Array of system check strategies
   */
  const getMainSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    const accountExpirationDate = accountContext?.account?.account_expiration_date

    if (!accountExpirationDate) {
      throw new Error('Account expiration date undefined. Did you forget to check isReady?')
    }

    const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false })
    const updateRegistration = () =>
      registrationApi.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname)

    const systemChecks: SystemCheckStrategy[] = [
      new DeviceInvalidatedSystemCheck(getIdToken, navigation, utils),
      new DeviceCountSystemCheck(getIdToken, utils),
      new AccountExpiryWarningBannerSystemCheck(accountExpirationDate, utils),
      // TODO (ar/bm): v3 doesn't include the checks below; re-add if needed in future
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
      systemChecks.push(new UpdateDeviceRegistrationSystemCheck(store.bcsc.appVersion, updateRegistration, utils))
    }

    return systemChecks
  }, [
    accountContext?.account?.account_expiration_date,
    isBCServicesCardBundle,
    navigation,
    registrationApi,
    store.bcsc.appVersion,
    store.bcsc.selectedNickname,
    store.bcscSecure.registrationAccessToken,
    tokenApi,
    utils,
  ])

  return {
    [SystemCheckScope.STARTUP]: {
      getSystemChecks: getStartupSystemChecks,
      isReady: defaultReadiness && store.stateLoaded,
    },
    [SystemCheckScope.MAIN_STACK]: {
      getSystemChecks: getMainSystemChecks,
      isReady:
        defaultReadiness && store.bcscSecure.isHydrated && Boolean(accountContext?.account?.account_expiration_date),
    },
  }
}
