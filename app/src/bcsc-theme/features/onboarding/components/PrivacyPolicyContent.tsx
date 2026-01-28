import { CardButton } from '@/bcsc-theme/components/CardButton'
import { ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface PrivacyPolicyContentProps {
  onLearnMore: () => void
}

/**
 * Privacy Policy content that informs users about the app's privacy practices.
 *
 * onLearnMore: function to be called when the Learn More button is pressed.
 *
 * @returns {*} {React.ReactElement} The PrivacyPolicyContent component.
 */
export const PrivacyPolicyContent: React.FC<PrivacyPolicyContentProps> = ({
  onLearnMore,
}: PrivacyPolicyContentProps): React.ReactElement => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    sectionContainer: {
      gap: theme.Spacing.sm,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
  })

  return (
    <>
      <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentA')}</ThemedText>

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
        <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentB')}</ThemedText>
      </View>

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
        <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.PrivacyPolicyContentC')}</ThemedText>
      </View>

      <CardButton title={t('BCSC.Onboarding.LearnMore')} onPress={onLearnMore} endIcon="open-in-new" />
    </>
  )
}
