import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useNavigation } from '@react-navigation/native'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const resetTriggered = useRef(false)

  const onConfirm = async () => {
    resetTriggered.current = true
    await resetWallet()
    navigation.goBack()
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
