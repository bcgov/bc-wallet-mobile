import { CardButton } from '@/bcsc-theme/components/CardButton'
import { BCSCOnboardingStackParams, BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Navigation will only be called from the onboarding stack
// Route params can be provided in either stack
interface PrivacyPolicyScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.PrivacyPolicy>
  route: RouteProp<BCSCRootStackParams | BCSCOnboardingStackParams, BCSCScreens.PrivacyPolicy>
}

/**
 * Privacy Policy screen component that informs users about the app's privacy practices.
 *
 * @returns {*} {JSX.Element} The PrivacyPolicyScreen component.
 */
export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({
  navigation,
  route,
}: PrivacyPolicyScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const interactive = route.params?.interactive

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
    buttonContainer: {
      padding: theme.Spacing.md,
    },
    sectionContainer: {
      gap: theme.Spacing.sm,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
  })

  const handlePressLearnMore = async () => {
    try {
      await Linking.openURL(SECURE_APP_LEARN_MORE_URL)
    } catch (error) {
      logger.error('Error opening Secure App Help URL', error instanceof Error ? error : new Error(String(error)))
    }
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

        <CardButton title={t('Unified.Onboarding.LearnMore')} onPress={handlePressLearnMore} endIcon="open-in-new" />
      </ScrollView>

      {interactive ? (
        <View style={styles.buttonContainer}>
          <Button
            title={t('Global.Continue')}
            buttonType={ButtonType.Primary}
            onPress={() => {
              navigation.navigate(BCSCScreens.OnboardingTermsOfUse)
            }}
            testID={testIdWithKey('Continue')}
            accessibilityLabel={t('Global.Continue')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}
