import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import DeleteConfirmationScreen from '@/bcsc-theme/components/DeleteConfirmationScreen'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [, dispatch] = useStore<BCState>()

  const onConfirm = async () => {
    const stopLoading = loadingScreen.startLoading(t('BCSC.Wallet.Resetting'))
    // BifoldScope holds reference to the agent, so during the reset the entire navigation stack is re rendered
    // Navigate back while still mounted so the navigation ref is fresh.
    // The loading overlay covers settings until the async resetWallet finishes
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      await resetWallet()
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.RESET_WALLET_SUCCESS,
            title: t('BCSC.Wallet.ResetSuccess'),
            type: 'success',
            dismissible: true,
          },
        ],
      })
      logger.info('[ResetWallet] User confirmed wallet reset, wallet reset has been reset successfully')
    } catch (error) {
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          { id: BCSCBanner.RESET_WALLET_ERROR, title: t('BCSC.Wallet.ResetError'), type: 'error', dismissible: true },
        ],
      })
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
