import {
  DeviceCountSystemCheck,
  runSystemChecks,
  ServerStatusSystemCheck,
  SystemCheckStrategy,
} from '@/services/system-checks'
import { useStore } from '@bifold/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'
import useConfigApi from '../api/hooks/useConfigApi'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'

export enum SystemCheckScope {
  STARTUP = 'startup',
  MAIN_STACK = 'mainStack',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * @param {SystemCheckScope} scope - The scope of the system checks to run.
 * @returns {void}
 */
export const useSystemChecks = (scope: SystemCheckScope) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const startupCheckRef = useRef<boolean>(false)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    const asyncEffect = async () => {
      if (startupCheckRef.current || !isClientReady || !client) {
        return
      }

      startupCheckRef.current = true

      let systemChecks: SystemCheckStrategy[] = []

      // Checks to run on app startup (root stack)
      if (scope === SystemCheckScope.STARTUP) {
        systemChecks = [
          new ServerStatusSystemCheck({
            dispatch,
            translation: t,
            getServerStatus: configApi.getServerStatus,
          }),
        ]
      }

      // Checks to run on main stack (verified users)
      if (scope === SystemCheckScope.MAIN_STACK) {
        systemChecks = [
          new DeviceCountSystemCheck({
            dispatch,
            translation: t,
            getIdToken: () => tokenApi.getCachedIdTokenMetadata({ refreshCache: true }),
          }),
        ]
      }

      await runSystemChecks(systemChecks)
    }

    asyncEffect()
  }, [client, configApi, dispatch, isClientReady, scope, t, tokenApi])
  // TODO (MD): Return something if needed?
}
