import { runSystemChecks, SystemCheckStrategy } from '@/services/system-checks/system-checks'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'
import useConfigApi from '../api/hooks/useConfigApi'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'

export enum SystemCheckScope {
  STARTUP = 'startup',
  MAIN_STACK = 'mainStack',
  LISTENER = 'listener',
}

/**
 * Hook to run system checks based on the provided scope.
 *
 * Scopes:
 *   - STARTUP: Checks that need to run when the app starts, regardless of user authentication ie: server status, internet connectivity
 *   - MAIN_STACK: Checks that run when the user is authenticated and in the main part of the app ie: current device count
 *   - LISTENER: Checks that need to subscribe to events and or state changes
 *
 * @param {SystemCheckScope[]} scopes - The scopes determining which checks to run.
 * @returns {void}
 */
export const useSystemChecks = (scopes: SystemCheckScope[]) => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const [loading, setLoading] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const startupCheckRef = useRef<boolean>(false)

  // console.log({
  //   isConnected: netInfo.isConnected,
  //   isInternetReachable: netInfo.isInternetReachable,
  // })

  /**
   * Checks to run as listeners for real-time updates (eg: internet connectivity)
   */
  // useEffect(() => {
  //   if (!scopes.includes(SystemCheckScope.LISTENER)) {
  //     return
  //   }
  //
  //   const asyncEffect = async () => {
  //     const systemChecks = [new InternetStatusSystemCheck(Boolean(false))]
  //
  //     await runSystemChecks(systemChecks)
  //   }
  //
  //   asyncEffect()
  // }, [scopes])

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

      const systemChecks: SystemCheckStrategy[] = []

      const utils = { dispatch, translation: t, logger }

      // Checks to run on app startup (root stack)
      if (scopes.includes(SystemCheckScope.STARTUP)) {
        systemChecks.push(new InternetStatusSystemCheck(Boolean(false)))
      }

      // Checks to run on main stack (verified users)
      if (scopes.includes(SystemCheckScope.MAIN_STACK)) {
        const getIdToken = () => tokenApi.getCachedIdTokenMetadata({ refreshCache: true })
        systemChecks.push(new DeviceCountSystemCheck(getIdToken, utils))
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
  }, [client, configApi, dispatch, isClientReady, logger, scopes, t, tokenApi])

  return { loading }
}
