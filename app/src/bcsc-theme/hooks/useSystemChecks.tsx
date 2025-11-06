import { useEventListener } from '@/hooks/useEventListener'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { runSystemChecks, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { TOKENS, useServices, useStore } from '@bifold/core'
import NetInfo from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getBundleId } from 'react-native-device-info'
import BCSCApiClient from '../api/client'
import useConfigApi from '../api/hooks/useConfigApi'
import useTokenApi from '../api/hooks/useTokens'
import { ModalNavigation } from '../types/navigators'
import { useBCSCApiClientState } from './useBCSCApiClient'

const PROD_BCSC_BUNDLE_ID = 'ca.bc.gov.id.servicescard'
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
  const navigation = useNavigation<ModalNavigation>()
  const ranSystemChecksRef = useRef(false)

  // Internet connectivity event listener
  useEventListener(() => {
    return NetInfo.addEventListener(async (netInfo) => {
      await runSystemChecks([new InternetStatusSystemCheck(netInfo, navigation, logger)])
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
          const startupChecks: SystemCheckStrategy[] = [new ServerStatusSystemCheck(configApi.getServerStatus, utils)]

          const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

          // Only inject the update check when explicitly using BCSC bundles ie: ca.bc.gov.id.servicescard
          if (isBCServicesCardBundle) {
            startupChecks.push(new UpdateAppSystemCheck(PROD_BCSC_BUNDLE_ID, navigation, utils))
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
  }, [client, configApi.getServerStatus, dispatch, isClientReady, logger, navigation, scope, t, tokenApi])
}
