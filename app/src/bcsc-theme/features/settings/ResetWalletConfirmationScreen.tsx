import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const loadingScreen = useLoadingScreen()

  const loaderRef = useRef<(() => void) | null>(null)

  const onConfirm = async () => {
    loaderRef.current = loadingScreen.startLoading(t('BCSC.Wallet.Resetting'))
    await resetWallet()
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
  }

  useEffect(() => {
    return () => {
      loaderRef.current?.()
      loaderRef.current = null
    }
  }, [])

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
