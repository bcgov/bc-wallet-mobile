import { CardButton } from '@/bcsc-theme/components/CardButton'
import { ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface PrivacyPolicyContentProps {
  onLearnMore: () => void
  controls?: React.ReactNode
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
  controls,
}: PrivacyPolicyContentProps): React.ReactElement => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    sectionContainer: {
      gap: theme.Spacing.sm,
    },
  })

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: theme.Spacing.md, padding: theme.Spacing.lg }}
    >
      <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentA')}</ThemedText>

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
        <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentB')}</ThemedText>
      </View>

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
        <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentC')}</ThemedText>
      </View>

      <CardButton title={t('BCSC.Onboarding.LearnMore')} onPress={onLearnMore} endIcon="open-in-new" />
    </ScreenWrapper>
  )
}
