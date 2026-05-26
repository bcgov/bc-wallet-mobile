import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const loadingScreen = useLoadingScreen()

  const onConfirm = async () => {
    const stopLoading = loadingScreen.startLoading(t('BCSC.Wallet.Resetting'))
    // Navigate back while still mounted so the navigation ref is fresh.
    // The loading overlay covers settings during the async reset, and finally
    // reveals it when done — no flash of the confirmation screen possible.
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      await resetWallet()
    } finally {
      stopLoading()
    }
  }

  return (
    <DeleteConfirmationScreen
      title={t('BCSC.Wallet.ResetTitle')}
      description={t('BCSC.Wallet.ResetDescription')}
      confirmLabel={t('BCSC.Wallet.Reset')}
      loadingLabel={t('BCSC.Wallet.Resetting')}
      onConfirm={onConfirm}
    />
  )
}

export const MainResetWalletConfirmationScreen = () => {
  return <ResetWalletConfirmationScreen />
}

export default ResetWalletConfirmationScreen
