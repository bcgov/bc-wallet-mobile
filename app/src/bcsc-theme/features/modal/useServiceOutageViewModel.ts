import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const useServiceOutageViewModel = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { isAvailable, statusMessage, isChecking, refresh } = useServerStatus()

  const handleCheckAgain = useCallback(async () => {
    const result = await refresh({ force: true })

    if (!result.isAvailable) {
      return
    }

    const state = navigation.getState()
    const currentRouteName = state?.routes?.[state.index]?.name
    if (currentRouteName === BCSCModals.ServiceOutage && navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [refresh, navigation])

  const contentText = statusMessage ? [statusMessage] : [t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle')]

  return {
    headerText: t('BCSC.Modals.ServiceOutage.Header'),
    contentText,
    skipVerificationText: t('BCSC.VerifyPrompt.SkipVerification'),
    buttonText: t('BCSC.Modals.ServiceOutage.CheckAgainButton'),
    isCheckDisabled: isChecking,
    isAvailable,
    handleCheckAgain,
  }
}

export default useServiceOutageViewModel
