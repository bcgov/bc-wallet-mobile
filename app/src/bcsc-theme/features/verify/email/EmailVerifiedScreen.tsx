import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Spacing } from '@/bcwallet-theme/theme'
import { Button, ButtonType, ScreenWrapper, testIdWithKey } from '@bifold/core'
import { CommonActions, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet } from 'react-native'

type EmailVerifiedScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EmailVerified>
}

const EmailVerifiedScreen = ({ navigation }: EmailVerifiedScreenProps) => {
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.lg,
    },
  })

  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return subscription.remove
  })

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey('Continue')}
        accessibilityLabel={t('Global.Continue')}
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        onPress={() =>
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.SetupSteps }],
            })
          )
        }
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={styles.contentContainer}>
      <StatusDetails title={t('BCSC.EmailVerified.Title')} />
    </ScreenWrapper>
  )
}

export default EmailVerifiedScreen
