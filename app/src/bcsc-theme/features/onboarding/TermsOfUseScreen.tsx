import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// TODO (MD): Waiting on final content, replace mock content with real terms of use text
const mockTermsOfUseContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUseScreen>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {JSX.Element} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = (props: TermsOfUseScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
    buttonContainer: {
      paddingTop: theme.Spacing.md,
      paddingHorizontal: theme.Spacing.md,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={styles.contentText}>{mockTermsOfUseContent}</ThemedText>
        <ThemedText style={styles.contentText}>{mockTermsOfUseContent}</ThemedText>
        <ThemedText style={styles.contentText}>{mockTermsOfUseContent}</ThemedText>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('Unified.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            props.navigation.navigate(BCSCScreens.OnboardingNotificationsScreen)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('Unified.Onboarding.AcceptAndContinueButton')}
        />
      </View>
    </SafeAreaView>
  )
}
