import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

type OnboardingPrivacyInformationScreenProps = {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingPrivacyInformation>
}

/**
 * Read-only Privacy Information screen for the Onboarding stack's settings menu.
 *
 * Unlike OnboardingPrivacyPolicyScreen (part of the onboarding acceptance flow, which renders a
 * "Continue" control that advances to Terms of Use), this screen shows the privacy content only —
 * matching the Main/Auth/Verify settings privacy screens.
 */
export const OnboardingPrivacyInformationScreen = ({ navigation }: OnboardingPrivacyInformationScreenProps) => {
  const { t } = useTranslation()

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Screens.PrivacyInformation'),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  return <PrivacyPolicyContent onLearnMore={handleLearnMore} />
}
