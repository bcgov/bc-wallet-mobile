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
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { removeAccount } from 'react-native-bcsc-core'

interface LockoutScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.DeviceAuthInfo>
}

export const LockoutScreen: React.FC<LockoutScreenProps> = () => {
  const { TextTheme, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: TextTheme.normal.color,
      width: '100%',
    },
  })

  const onPressRemoveAccount = useCallback(async () => {
    try {
      await removeAccount()
    } catch (error) {
      const strErr = error instanceof Error ? error.message : String(error)
      logger.error(`Error removing account: ${strErr}`)
    }
  }, [logger])

  const controls = (
    <Button
      buttonType={ButtonType.Critical}
      title={t('BCSC.Account.RemoveAccount')}
      accessibilityLabel={t('BCSC.Account.RemoveAccount')}
      testID={testIdWithKey('RemoveAccount')}
      onPress={onPressRemoveAccount}
    />
  )

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{`Too many PIN attempts`}</ThemedText>
      <ThemedText>{`This app is temporarily locked because you've entered an incorrect PIN too many times.`}</ThemedText>
      <ThemedText variant={'bold'}>{`You can try again in:`}</ThemedText>
      <ThemedText variant={'bold'}>{`9 minutes 51 seconds`}</ThemedText>
      <View style={styles.hr} />
      <ThemedText variant={'bold'}>{`Cannot remember your PIN?`}</ThemedText>
      <ThemedText>{`We cannot help you get or reset your PIN if you forget it. It's only saved on this device. It's never shared with us.`}</ThemedText>
      <ThemedText>{`If you've forgotten your PIN you'll need to set up this app again.`}</ThemedText>
    </ScreenWrapper>
  )
}
