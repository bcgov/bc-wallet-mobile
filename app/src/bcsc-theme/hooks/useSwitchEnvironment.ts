import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { IASEnvironment } from '@/utils/environment'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { setIssuer } from 'react-native-bcsc-core'

/**
 * Hook to switch the environment.
 * @returns A function to switch the environment, which performs a factory reset and updates the store.
 */
export const useSwitchEnvironment = () => {
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const factoryReset = useFactoryReset()

  const switchEnvironment = useCallback(
    async (environment: IASEnvironment) => {
      try {
        // hard factory reset, no state saved
        await factoryReset()

        const success = await setIssuer(environment.iasApiBaseUrl)

        // Update the analytics tracker with the new app ID for the selected environment
        Analytics.setAppId(environment.analyticsAppId)

        logger.info('[BCSCCore] persisting issuer:', {
          issuer: environment.iasApiBaseUrl,
          success: success,
        })

        dispatch({
          type: BCDispatchAction.UPDATE_ENVIRONMENT,
          payload: [environment],
        })
      } catch (error) {
        logger.error('[useSwitchEnvironment] Error during factory reset for environment change:', error as Error)
      }
    },
    [dispatch, factoryReset, logger]
  )

  return useMemo(() => switchEnvironment, [switchEnvironment])
}
