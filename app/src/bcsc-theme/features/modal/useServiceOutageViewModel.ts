import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi from '@/bcsc-theme/api/hooks/useConfigApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCAuthStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ServiceOutageRouteProps = RouteProp<BCSCAuthStackParams, BCSCModals.ServiceOutage>

const useServiceOutageViewModel = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute<ServiceOutageRouteProps>()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const client = useBCSCApiClient()
  const configApi = useConfigApi(client as BCSCApiClient)
  const [statusMessage, setStatusMessage] = useState(route.params?.statusMessage)

  const handleCheckAgain = useCallback(async () => {
    try {
      const serverStatus = await configApi.getServerStatus()
      const utils = { dispatch, translation: t, logger }
      const check = new ServerStatusSystemCheck(serverStatus, utils, navigation)

      if (check.runCheck()) {
        // onSuccess() handles modal dismissal via navigation.goBack() and banner cleanup
        check.onSuccess()
      } else {
        check.onFail()
        setStatusMessage(
          serverStatus.statusMessage ?? t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle')
        )
      }
    } catch (error) {
      logger.error('ServiceOutage: Failed to re-check server status', error as Error)
    }
  }, [configApi, dispatch, t, logger, navigation])

  const contentText = statusMessage
    ? [statusMessage]
    : [t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle')]

  return {
    headerText: t('BCSC.Modals.ServiceOutage.Header'),
    contentText,
    buttonText: t('BCSC.Modals.ServiceOutage.CheckAgainButton'),
    handleCheckAgain,
  }
}

export default useServiceOutageViewModel
