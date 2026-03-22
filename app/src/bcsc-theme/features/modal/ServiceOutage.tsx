import BCSCApiClient from '@/bcsc-theme/api/client'
import useConfigApi from '@/bcsc-theme/api/hooks/useConfigApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCAuthStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'
import { BCState } from '@/store'

type ServiceOutageRouteProps = RouteProp<BCSCAuthStackParams, BCSCModals.ServiceOutage>

export const ServiceOutage = (): React.ReactElement => {
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
        check.onSuccess()

        if (navigation.canGoBack()) {
          navigation.goBack()
        }
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

  return (
    <SystemModal
      iconName="error-outline"
      headerText={t('BCSC.Modals.ServiceOutage.Header')}
      contentText={contentText}
      buttonText={t('BCSC.Modals.ServiceOutage.CheckAgainButton')}
      onButtonPress={handleCheckAgain}
    />
  )
}
