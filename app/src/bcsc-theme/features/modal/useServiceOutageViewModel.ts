import useServerStatusCheck from '@/bcsc-theme/hooks/useServerStatusCheck'
import { BCSCAuthStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { openLink } from '@/utils/links'
import { RouteProp, useRoute } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ServiceOutageRouteProps = RouteProp<BCSCAuthStackParams, BCSCModals.ServiceOutage>

const useServiceOutageViewModel = () => {
  const { t } = useTranslation()
  const route = useRoute<ServiceOutageRouteProps>()
  const [statusMessage, setStatusMessage] = useState(route.params?.statusMessage)
  const { checkServerStatus, isChecking, isClientReady } = useServerStatusCheck()

  const handleCheckAgain = useCallback(async () => {
    const result = await checkServerStatus()

    if (!result.isAvailable) {
      setStatusMessage(result.statusMessage ?? t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'))
    }
  }, [checkServerStatus, t])

  const contentText = statusMessage ? [statusMessage] : [t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle')]

  const handleLearnMore = useCallback(() => {
    openLink(HelpCentreUrl.HOME)
  }, [])

  return {
    headerText: t('BCSC.Modals.ServiceOutage.Header'),
    contentText,
    learnMoreText: t('BCSC.Modals.ServiceOutage.LearnMore'),
    buttonText: t('BCSC.Modals.ServiceOutage.CheckAgainButton'),
    isCheckDisabled: isChecking || !isClientReady,
    handleCheckAgain,
    handleLearnMore,
  }
}

export default useServiceOutageViewModel
