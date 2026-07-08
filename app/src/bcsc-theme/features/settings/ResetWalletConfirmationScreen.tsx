import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

const ResetWalletConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const { resetWallet } = useBCSCAgent()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [, dispatch] = useStore<BCState>()
  const [disabled, setDisabled] = useState(false)

  const onConfirm = async () => {
    if (disabled) {
      return
    }
    setDisabled(true)
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

  const controls = (
    <ControlContainer>
      <Button
        accessibilityLabel={t('BCSC.Wallet.Reset')}
        buttonType={ButtonType.Critical}
        title={t('BCSC.Wallet.Reset')}
        testID={testIdWithKey('ConfirmDestructiveAction')}
        onPress={onConfirm}
        disabled={disabled}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
      edges={['bottom', 'left', 'right']}
      padded={false}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.Wallet.ResetTitle')}</ThemedText>
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
    </ScreenWrapper>
  )
}

export const MainResetWalletConfirmationScreen = () => {
  return <ResetWalletConfirmationScreen />
}

export default ResetWalletConfirmationScreen
