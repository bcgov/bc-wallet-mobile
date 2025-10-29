import {
  DeviceCountSystemCheck,
  runSystemChecks,
  ServerStatusSystemCheck,
  SystemCheckStrategy,
} from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
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
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: server status, internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
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
  const [loading, setLoading] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const startupCheckRef = useRef<boolean>(false)

  /**
   * Checks to run on app startup to ensure system is operational.
   */
  useEffect(() => {
    const asyncEffect = async () => {
      if (startupCheckRef.current || !isClientReady || !client) {
        return
      }

      setLoading(true)
      startupCheckRef.current = true

      let systemChecks: SystemCheckStrategy[] = []

      const utils = { dispatch, translation: t, logger }

      // Checks to run on app startup (root stack)
      if (scope === SystemCheckScope.STARTUP) {
        systemChecks = [new ServerStatusSystemCheck(configApi.getServerStatus, utils)]
      }

      // Checks to run on main stack (verified users)
      if (scope === SystemCheckScope.MAIN_STACK) {
        const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: true })
        systemChecks = [new DeviceCountSystemCheck(getIdToken, utils)]
      }

      try {
        await runSystemChecks(systemChecks)
      } catch (error) {
        logger.error(`System checks failed: ${(error as Error).message}`)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [client, configApi, dispatch, isClientReady, logger, scope, t, tokenApi])

  return { loading }
}
