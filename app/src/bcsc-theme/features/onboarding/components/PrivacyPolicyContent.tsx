import { CardButton } from '@/bcsc-theme/components/CardButton'
import { ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

interface PrivacyPolicyContentProps {
  onLearnMore: () => void
  controls?: React.ReactNode
  /**
   * Optional hidden developer-menu trigger. When provided, the intro paragraph becomes an
   * accessibility-invisible Pressable. Used only on the first onboarding screen so dev/QA can
   * still reach the developer (IAS environment) menu before device registration happens.
   */
  onHiddenDevPress?: () => void
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
  onHiddenDevPress,
}: PrivacyPolicyContentProps): React.ReactElement => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    sectionContainer: {
      gap: theme.Spacing.sm,
    },
  })

  const introParagraph = <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentA')}</ThemedText>

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: theme.Spacing.md, padding: theme.Spacing.lg }}
    >
      {onHiddenDevPress ? (
        <Pressable
          onPress={onHiddenDevPress}
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          testID={testIdWithKey('DeveloperCounter')}
        >
          {introParagraph}
        </Pressable>
      ) : (
        introParagraph
      )}

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSetup')}</ThemedText>
        <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentB')}</ThemedText>
      </View>

      <View style={styles.sectionContainer}>
        <ThemedText variant="headingFour">{t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp')}</ThemedText>
        <ThemedText>{t('BCSC.Onboarding.PrivacyPolicyContentC')}</ThemedText>
      </View>
      <CardButton
        title={t('BCSC.Onboarding.LearnMore')}
        testID={testIdWithKey('LearnMore')}
        onPress={onLearnMore}
        endIcon="open-in-new"
      />
    </ScreenWrapper>
  )
}
