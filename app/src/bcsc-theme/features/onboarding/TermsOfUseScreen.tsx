import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const mockTermsOfUseContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

export const TermsOfUseScreen: React.FC = () => {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigation = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()

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
          title={t('BCSCOnboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingNotificationsScreen)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('BCSCOnboarding.AcceptAndContinueButton')}
        />
      </View>
    </SafeAreaView>
  )
}
