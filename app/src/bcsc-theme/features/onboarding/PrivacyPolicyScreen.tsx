import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
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
    learnMoreContainer: {
      padding: theme.Spacing.md,
      backgroundColor: theme.ColorPalette.brand.secondaryBackground,
      borderWidth: 1,
      borderColor: theme.ColorPalette.brand.primaryLight,
      borderRadius: theme.Spacing.xs,
    },
    learnMoreText: {
      fontWeight: 'bold',
      color: theme.ColorPalette.brand.primary,
      fontSize: 18,
    },
  })

  const handlePressLearnMore = () => {
    // TODO (MD): Open privacy policy link in browser
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={styles.contentText}>{t('BCSCOnboarding.PrivacyPolicyContentA')}</ThemedText>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('BCSCOnboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('BCSCOnboarding.PrivacyPolicyContentB')}</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('BCSCOnboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('BCSCOnboarding.PrivacyPolicyContentC')}</ThemedText>
        </View>

        <View style={styles.learnMoreContainer}>
          <ThemedText style={styles.learnMoreText}>{t('BCSCOnboarding.PrivacyPolicyLearnMore')}</ThemedText>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSCOnboarding.ContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingTermsOfUseScreen)
          }}
        />
      </View>
    </SafeAreaView>
  )
}
