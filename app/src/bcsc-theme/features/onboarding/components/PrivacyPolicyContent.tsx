import { CardButton } from '@/bcsc-theme/components/CardButton'
import { TestIds } from '@/test-ids/registry'
import { ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface PrivacyPolicyContentProps {
  onLearnMore: () => void
  controls?: React.ReactNode
}

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
      <CardButton
        title={t('BCSC.Onboarding.LearnMore')}
        testID={testIdWithKey(TestIds.onboarding.privacyPolicy.learnMore)}
        onPress={onLearnMore}
      />
    </ScreenWrapper>
  )
}
