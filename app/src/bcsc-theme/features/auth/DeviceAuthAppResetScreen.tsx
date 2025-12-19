import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
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
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
// import { useTranslation } from 'react-i18next'

interface DeviceAuthAppResetScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.DeviceAuthInfo>
}

export const DeviceAuthAppResetScreen: React.FC<DeviceAuthAppResetScreenProps> = () => {
  const { Spacing } = useTheme()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onPressSetUpApp = useCallback(async () => {
    try {
      await factoryReset()
    } catch (error) {
      const strErr = error instanceof Error ? error.message : String(error)
      logger.error(`Error resetting account: ${strErr}`)
    }
  }, [logger, factoryReset])

  const onPressLearnMore = useCallback(() => {
    // TODO (bm): implement
  }, [])

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={`Set Up App`}
        accessibilityLabel={`Set Up App`}
        testID={testIdWithKey('SetUpApp')}
        onPress={onPressSetUpApp}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={`Learn More`}
        accessibilityLabel={`Learn More`}
        testID={testIdWithKey('LearnMore')}
        onPress={onPressLearnMore}
      />
    </>
  )

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{`App reset for security`}</ThemedText>
      <ThemedText>{`For security reasons, you must set and keep a passcode on your phone.`}</ThemedText>
      <ThemedText>{`It looks like you may have turned off the passcode on this device.`}</ThemedText>
      <ThemedText>{`When you do this, your app is reset and you need to set it up again.`}</ThemedText>
    </ScreenWrapper>
  )
}
