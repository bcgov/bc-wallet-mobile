import { CardButton } from '@/bcsc-theme/components/CardButton'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const PrivacyPolicyScreen: React.FC = () => {
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
    buttonContainer: {
      paddingTop: theme.Spacing.md,
      paddingHorizontal: theme.Spacing.md,
    },
    sectionContainer: {
      gap: theme.Spacing.sm,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
  })

  const handlePressLearnMore = () => {
    // TODO (MD): Open privacy policy link in browser
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={styles.contentText}>{t('Unified.Onboarding.PrivacyPolicyContentA')}</ThemedText>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('Unified.Onboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('Unified.Onboarding.PrivacyPolicyContentB')}</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('Unified.Onboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('Unified.Onboarding.PrivacyPolicyContentC')}</ThemedText>
        </View>

        <CardButton
          title={t('Unified.Onboarding.PrivacyPolicyLearnMore')}
          onPress={handlePressLearnMore}
          endIcon="open-in-new"
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('Unified.Onboarding.ContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingTermsOfUseScreen)
          }}
          testID={testIdWithKey('Continue')}
          accessibilityLabel={t('Unified.Onboarding.ContinueButton')}
        />
      </View>
    </SafeAreaView>
  )
}
