import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
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

  return <PrivacyPolicyContent onPress={onPress} onLearnMore={handleLearnMore} />
}
