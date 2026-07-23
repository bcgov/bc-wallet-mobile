import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import DestructiveConfirmationScreen from '@/bcsc-theme/components/DestructiveConfirmationScreen'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { ThemedText } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const { resetWallet } = useBCSCAgent()

  return (
    <DestructiveConfirmationScreen
      title={t('BCSC.Wallet.ResetTitle')}
      confirmLabel={t('BCSC.Wallet.Reset')}
      loadingLabel={t('BCSC.Wallet.Resetting')}
      logScope={'ResetWallet'}
      action={resetWallet}
    >
      <ThemedText>{t('BCSC.Wallet.ResetIntro')}</ThemedText>
      <View>
        <BulletPoint pointsText={t('BCSC.Wallet.ResetFeatureContacts')} />
        <BulletPoint pointsText={t('BCSC.Wallet.ResetFeatureCredentials')} />
        <BulletPoint pointsText={t('BCSC.Wallet.ResetFeatureProofRequests')} />
        <BulletPoint pointsText={t('BCSC.Wallet.ResetFeatureWalletTab')} />
      </View>
      <ThemedText>{t('BCSC.Wallet.ResetExplanation')}</ThemedText>
      <View>
        <BulletPoint pointsText={t('BCSC.Wallet.ResetLossCredentials')} />
        <BulletPoint pointsText={t('BCSC.Wallet.ResetLossContacts')} />
        <BulletPoint pointsText={t('BCSC.Wallet.ResetLossProofRequests')} />
      </View>
    </DestructiveConfirmationScreen>
  )
}

export const MainResetWalletConfirmationScreen = () => {
  return <ResetWalletConfirmationScreen />
}

export default ResetWalletConfirmationScreen
