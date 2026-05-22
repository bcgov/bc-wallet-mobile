import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'

import React from 'react'
import { useTranslation } from 'react-i18next'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const { resetWallet } = useBCSCAgent()

  return (
    <DeleteConfirmationScreen
      title={t('BCSC.Wallet.ResetTitle')}
      description={t('BCSC.Wallet.ResetDescription')}
      confirmLabel={t('BCSC.Wallet.Reset')}
      loadingLabel={t('BCSC.Wallet.Resetting')}
      onConfirm={resetWallet}
    />
  )
}

export const MainResetWalletConfirmationScreen = () => {
  return <ResetWalletConfirmationScreen />
}

export default ResetWalletConfirmationScreen
