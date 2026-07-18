import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
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

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const factoryReset = useFactoryReset()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [, dispatch] = useStore<BCState>()
  const [disabled, setDisabled] = useState(false)

  const onConfirm = async () => {
    if (disabled) {
      return
    }
    setDisabled(true)
    const stopLoading = loadingScreen.startLoading(t('BCSC.Account.RemoveAccountLoading'))
    navigation.setOptions({ animationEnabled: false })
    navigation.goBack()
    try {
      logger.info('[RemoveAccount] User confirmed account removal, proceeding with verification reset')

      const result = await factoryReset()
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          result.success
            ? {
                id: BCSCBanner.REMOVE_ACCOUNT_SUCCESS,
                title: t('BCSC.Account.RemoveAccountSuccess'),
                type: 'success',
                dismissible: true,
              }
            : {
                id: BCSCBanner.REMOVE_ACCOUNT_ERROR,
                title: t('BCSC.Account.RemoveAccountError'),
                type: 'error',
                dismissible: true,
              },
        ],
      })
      if (!result.success) {
        logger.error('[RemoveAccount] Failed to remove account', result.error)
      }
    } catch (error) {
      dispatch({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.REMOVE_ACCOUNT_ERROR,
            title: t('BCSC.Account.RemoveAccountError'),
            type: 'error',
            dismissible: true,
          },
        ],
      })
      logger.error('[RemoveAccount] Error during account removal', error as Error)
    } finally {
      stopLoading()
    }
  }

  const controls = (
    <ControlContainer>
      <Button
        accessibilityLabel={t('BCSC.Account.RemoveAccount')}
        buttonType={ButtonType.Critical}
        title={t('BCSC.Account.RemoveAccount')}
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
      <ThemedText variant={'headingThree'}>{t('BCSC.Account.RemoveAccountTitle')}</ThemedText>
      <ThemedText>{t('BCSC.Account.RemoveAccountParagraph')}</ThemedText>
    </ScreenWrapper>
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
