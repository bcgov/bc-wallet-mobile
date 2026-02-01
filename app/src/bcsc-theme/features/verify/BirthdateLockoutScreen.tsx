import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

interface BirthdateLockoutScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.BirthdateLockout>
}

export const BirthdateLockoutScreen = ({ navigation }: BirthdateLockoutScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const handleClose = () => {
    navigation.goBack()
  }

  const controls = (
    <Button
      title={t('Global.Close')}
      accessibilityLabel={t('Global.Close')}
      testID={testIdWithKey('Close')}
      onPress={handleClose}
      buttonType={ButtonType.Secondary}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.md }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.BirthdateLockout.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.BirthdateLockout.Message')}</ThemedText>
    </ScreenWrapper>
  )
}

export default BirthdateLockoutScreen
