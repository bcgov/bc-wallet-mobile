import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
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
  const onPress = () => {
    navigation.navigate(BCSCScreens.OnboardingOptInAnalytics)
  }

  return <PrivacyPolicyContent onPress={onPress} />
}
