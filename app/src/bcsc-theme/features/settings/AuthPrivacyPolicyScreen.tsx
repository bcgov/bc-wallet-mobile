import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

type AuthPrivacyPolicyScreenProps = {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AuthPrivacyPolicy>
}

/**
 * Privacy Policy screen for the Auth stack.
 */
export const AuthPrivacyPolicyScreen = ({ navigation }: AuthPrivacyPolicyScreenProps) => {
  const { t } = useTranslation()

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.AuthWebView, {
      title: t('BCSC.Screens.PrivacyInformation'),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  return <PrivacyPolicyContent onLearnMore={handleLearnMore} />
}
