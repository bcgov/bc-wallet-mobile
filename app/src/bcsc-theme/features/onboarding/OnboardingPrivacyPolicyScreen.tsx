import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from './components/PrivacyPolicyContent'

interface OnboardingPrivacyPolicyScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingPrivacyPolicy>
}

/**
 * Privacy Policy screen component that informs users about the app's privacy practices.
 *
 * @returns {*} {JSX.Element} The OnboardingPrivacyPolicyScreen component.
 */
export const OnboardingPrivacyPolicyScreen: React.FC<OnboardingPrivacyPolicyScreenProps> = ({
  navigation,
}: OnboardingPrivacyPolicyScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()

  const onPress = () => {
    navigation.navigate(BCSCScreens.OnboardingTermsOfUse)
  }

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  const controls = (
    <Button
      title={t('Global.Continue')}
      buttonType={ButtonType.Primary}
      onPress={onPress}
      testID={testIdWithKey('Continue')}
      accessibilityLabel={t('Global.Continue')}
    />
  )

  const scrollContentStyle = {
    gap: theme.Spacing.lg,
  }

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={scrollContentStyle}>
      <PrivacyPolicyContent onLearnMore={handleLearnMore} />
    </ScreenWrapper>
  )
}
