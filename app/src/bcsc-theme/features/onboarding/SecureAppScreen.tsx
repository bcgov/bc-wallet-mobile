import { CardButton } from '@/bcsc-theme/components/CardButton'
import { useWorkflowEngine } from '@/workflow/useWorkflowEngine'
import { ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Platform, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export enum OnboardingSecureAppMethod {
  PIN = 'PIN',
  BIOMETRICS = 'BIOMETRICS',
}

/**
 * Renders the Secure App screen, which provides options for securing the app using biometric authentication or a PIN.
 *
 * @returns {*} {JSX.Element} The SecureAppScreen component.
 */
export const SecureAppScreen = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const workflowEngine = useWorkflowEngine()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scollContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <ThemedText variant="headingThree">{t('Unified.Onboarding.SecureAppHeader')}</ThemedText>
        <ThemedText>{t('Unified.Onboarding.SecureAppContent')}</ThemedText>
        {Platform.OS === 'ios' ? (
          <CardButton
            title={t('Unified.Onboarding.SecureAppFaceIDTitle')}
            subtext={t('Unified.Onboarding.SecureAppFaceIDSubtext')}
            onPress={() => {
              // TODO (MD): Implement Face ID setup (Remove completed onboarding dispatch when implemented)
              workflowEngine.goToNextStep()
            }}
          />
        ) : (
          <CardButton
            title={'TODO: Android title'}
            subtext={'TODO: Android subtext'}
            onPress={() => {
              // TODO (MD): Implement Android biometric setup (Remove completed onboarding dispatch when implemented)
              workflowEngine.goToNextStep()
            }}
          />
        )}

        <CardButton
          title={t('Unified.Onboarding.SecureAppPINTitle')}
          subtext={t('Unified.Onboarding.SecureAppPINSubtext')}
          onPress={() => {
            // TODO (MD): Implement PIN setup (Remove completed onboarding dispatch when implemented)
            workflowEngine.goToNextStep()
          }}
        />

        <CardButton title={t('Unified.Onboarding.LearnMore')} endIcon="open-in-new" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  )
}
