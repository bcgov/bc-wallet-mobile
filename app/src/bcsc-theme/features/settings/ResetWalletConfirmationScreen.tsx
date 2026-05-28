import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { TOKENS, useServices } from '@bifold/core/lib/typescript/src/container-api'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onConfirm = async () => {
    const stopLoading = loadingScreen.startLoading(t('BCSC.Wallet.Resetting'))
    // BifoldScope holds reference to the agent, so during the reset the entire navigation stack is re rendered
    // Navigate back while still mounted so the navigation ref is fresh.
    // The loading overlay covers settings until the async resetWallet finishes
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      await resetWallet()
      Toast.show({ type: 'success', text1: t('BCSC.Wallet.ResetSuccess'), position: 'bottom' })
      logger.info('[ResetWallet] User confirmed wallet reset, proceeding with wallet reset')
    } catch (error) {
      Toast.show({ type: 'error', text1: t('BCSC.Wallet.ResetError'), position: 'bottom' })
      logger.error('[ResetWallet] Error during wallet reset', error as Error)
    } finally {
      stopLoading()
    }
  }

  return (
    <DeleteConfirmationScreen
      title={t('BCSC.Wallet.ResetTitle')}
      description={t('BCSC.Wallet.ResetDescription')}
      confirmLabel={t('BCSC.Wallet.Reset')}
      onConfirm={onConfirm}
    />
  )
}

export const MainResetWalletConfirmationScreen = () => {
  return <ResetWalletConfirmationScreen />
}

export default ResetWalletConfirmationScreen
