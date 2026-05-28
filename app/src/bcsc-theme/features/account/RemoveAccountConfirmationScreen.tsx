import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const factoryReset = useFactoryReset()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onConfirm = async () => {
    const stopLoading = loadingScreen.startLoading(t('BCSC.Account.RemoveAccountLoading'))
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      logger.info('[RemoveAccount] User confirmed account removal, proceeding with verification reset')

      const result = await factoryReset()

      if (!result.success) {
        logger.error('[RemoveAccount] Failed to remove account', result.error)
      }
      Toast.show({ type: 'success', text1: t('BCSC.Account.RemoveAccountSuccess'), position: 'bottom' })
    } catch (error) {
      Toast.show({ type: 'error', text1: t('BCSC.Account.RemoveAccountError'), position: 'bottom' })
      logger.error('[RemoveAccount] Error during account removal', error as Error)
    } finally {
      stopLoading()
    }
  }

  return (
    <DeleteConfirmationScreen
      title={t('BCSC.Account.RemoveAccountTitle')}
      description={t('BCSC.Account.RemoveAccountParagraph')}
      confirmLabel={t('BCSC.Account.RemoveAccount')}
      onConfirm={onConfirm}
    />
  )
}

export const MainRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export const VerifyRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export const OnboardingRemoveAccountConfirmationScreen = () => {
  return <RemoveAccountConfirmationScreen />
}

export default RemoveAccountConfirmationScreen
