import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export const DeviceAuthAppResetScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCAuthStackParams>>()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onPressSetUpApp = useCallback(async () => {
    try {
      await factoryReset()
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error resetting account: ${errMessage}`)
    }
  }, [logger, factoryReset])

  const onPressLearnMore = useCallback(() => {
    navigation.navigate(BCSCScreens.AuthWebView, {
      url: SECURE_APP_LEARN_MORE_URL,
      title: t('BCSC.Settings.Help'),
    })
  }, [navigation, t])

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AppReset.SetUpApp')}
        accessibilityLabel={t('BCSC.AppReset.SetUpApp')}
        testID={testIdWithKey('SetUpApp')}
        onPress={onPressSetUpApp}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.AppReset.LearnMore')}
        accessibilityLabel={t('BCSC.AppReset.LearnMore')}
        testID={testIdWithKey('LearnMore')}
        onPress={onPressLearnMore}
      />
    </>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.AppReset.Title')}</ThemedText>
      <ThemedText>{t('BCSC.AppReset.Body1')}</ThemedText>
      <ThemedText>{t('BCSC.AppReset.Body2')}</ThemedText>
      <ThemedText>{t('BCSC.AppReset.Body3')}</ThemedText>
    </ScreenWrapper>
  )
}
