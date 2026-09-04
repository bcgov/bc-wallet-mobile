import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi from '@/bcsc-theme/api/hooks/useConfigApi'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'

export interface ServerStatusCheckResult {
  isAvailable: boolean
  statusMessage?: string
}

/**
 * On-demand IAS server status check for gating outage-sensitive actions
 * (e.g. opening the Services list, starting a service login). Reuses
 * ServerStatusSystemCheck, so a failed check navigates to the ServiceOutage
 * modal and updates the outage banner exactly like the "Check Again" button
 * does today. Fails open (reports available) when the client isn't ready yet
 * or the status request itself throws, so a transient/network error never
 * blocks the caller's action.
 */
const useServerStatusCheck = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const [isChecking, setIsChecking] = useState(false)

  const checkServerStatus = useCallback(async (): Promise<ServerStatusCheckResult> => {
    if (!isClientReady) {
      return { isAvailable: true }
    }

    setIsChecking(true)
    try {
      const serverStatus = await configApi.getServerStatus()
      const utils = { dispatch, translation: t, logger }
      const check = new ServerStatusSystemCheck(serverStatus, utils, navigation)

      if (check.runCheck()) {
        check.onSuccess()
        return { isAvailable: true }
      }

      check.onFail()
      return { isAvailable: false, statusMessage: serverStatus.statusMessage }
    } catch (error) {
      logger.error('useServerStatusCheck: Failed to check server status', error as Error)
      return { isAvailable: true }
    } finally {
      setIsChecking(false)
    }
  }, [isClientReady, configApi, dispatch, t, logger, navigation])

  return { checkServerStatus, isChecking, isClientReady }
}

export default useServerStatusCheck
