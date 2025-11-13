import { CardButton } from '@/bcsc-theme/components/CardButton'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface PrivacyPolicyContentProps {
  onPress?: () => void
}

/**
 * Privacy Policy content that informs users about the app's privacy practices.
 *
 * onPress: optional function to be called when the Continue button is pressed,
 * if not provided, the Continue button will not be displayed.
 *
 * @returns {*} {JSX.Element} The PrivacyPolicyContent component.
 */
export const PrivacyPolicyContent: React.FC<PrivacyPolicyContentProps> = ({
  onPress,
}: PrivacyPolicyContentProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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
        <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentA')}</ThemedText>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentB')}</ThemedText>
        </View>

        <View style={styles.sectionContainer}>
          <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentC')}</ThemedText>
        </View>

        <CardButton title={t('BCSC.Onboarding.LearnMore')} onPress={handlePressLearnMore} endIcon="open-in-new" />
      </ScrollView>

      {onPress ? (
        <View style={styles.buttonContainer}>
          <Button
            title={t('Global.Continue')}
            buttonType={ButtonType.Primary}
            onPress={onPress}
            testID={testIdWithKey('Continue')}
            accessibilityLabel={t('Global.Continue')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}
