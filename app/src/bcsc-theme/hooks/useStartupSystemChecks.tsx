import { DeviceCountSystemCheck, runSystemChecks, ServerStatusSystemCheck } from '@/services/StartupChecks'
import { useStore } from '@bifold/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBCSCApiClientState } from './useBCSCApiClient'
import useConfigApi from '../api/hooks/useConfigApi'
import BCSCApiClient from '../api/client'
import useTokenApi from '../api/hooks/useTokens'

export const useSystemStartupChecks = () => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const tokenApi = useTokenApi(client as BCSCApiClient)

  const startupCheckRef = useRef<boolean>(false)

  useEffect(() => {
    const asyncEffect = async () => {
      if (startupCheckRef.current || !isClientReady || !client) {
        return
      }

      startupCheckRef.current = true

      await runSystemChecks([
        new ServerStatusSystemCheck({
          dispatch,
          bannerTitle: t('StartupChecks.ServerStatusBannerTitle'),
          getServerStatus: () => configApi.getServerStatus(),
        }),
        new DeviceCountSystemCheck({
          dispatch,
          bannerTitle: t('StartupChecks.DeviceLimitBannerTitle'),
          getIdToken: () => tokenApi.getCachedIdTokenMetadata({ refreshCache: false }),
        }),
      ])
    }

    asyncEffect()
  }, [client, configApi, dispatch, isClientReady, t, tokenApi])
  // TODO (MD): Return something if needed?
}
