import { CardButton } from '@/bcsc-theme/components/CardButton'
import { BC_LOGIN_PRIVACY_URL } from '@/constants'
import { Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'

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

  const onPrivacyLinkPress = () => {
    Linking.openURL(BC_LOGIN_PRIVACY_URL)
  }

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: theme.Spacing.md }}>
      <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentA')}</ThemedText>

      <Link
        linkText={t('BCSC.Onboarding.PrivacyPolicyBCLoginLink')}
        testID={testIdWithKey('PrivacyPolicyBCLoginLink')}
        onPress={onPrivacyLinkPress}
      />

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
