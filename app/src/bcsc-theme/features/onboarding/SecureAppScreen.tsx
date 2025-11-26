import { CardButton } from '@/bcsc-theme/components/CardButton'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { BCDispatchAction } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet } from 'react-native'

interface SecureAppScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingSecureApp>
}

/**
 * Renders the Secure App screen, which provides options for securing the app using biometric authentication or a PIN.
 *
 * @returns {*} {JSX.Element} The SecureAppScreen component.
 */
export const SecureAppScreen = ({ navigation }: SecureAppScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [, dispatch] = useStore()

  const styles = StyleSheet.create({
    scollContainer: {
      gap: Spacing.lg,
    },
  })

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.scollContainer}>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.SecureAppHeader')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.SecureAppContent')}</ThemedText>
      {Platform.OS === 'ios' ? (
        <CardButton
          title={t('BCSC.Onboarding.SecureAppFaceIDTitle')}
          subtext={t('BCSC.Onboarding.SecureAppFaceIDSubtext')}
          onPress={() => {
            // TODO (MD): Implement Face ID setup (Remove completed onboarding dispatch when implemented)
            dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
          }}
        />
      ) : (
        <CardButton
          title={t('BCSC.Onboarding.SecureAppBiometricsTitle')}
          subtext={t('BCSC.Onboarding.SecureAppBiometricsSubtext')}
          onPress={() => {
            // TODO (MD): Implement Android biometric setup (Remove completed onboarding dispatch when implemented)
            dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
          }}
        />
      )}

      <CardButton
        title={t('BCSC.Onboarding.SecureAppPINTitle')}
        subtext={t('BCSC.Onboarding.SecureAppPINSubtext')}
        onPress={() => {
          // TODO (MD): Implement PIN setup (Remove completed onboarding dispatch when implemented)
          dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
          navigation.navigate(BCSCScreens.OnboardingNotifications)
        }}
      />

      <CardButton title={t('BCSC.Onboarding.LearnMore')} endIcon="open-in-new" onPress={handleLearnMore} />
    </ScreenWrapper>
  )
}
