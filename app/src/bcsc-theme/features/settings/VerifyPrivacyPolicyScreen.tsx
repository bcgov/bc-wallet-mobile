import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

type VerifyPrivacyPolicyScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyPrivacyPolicy>
}

/**
 * Privacy Policy screen for the Verify stack.
 */
export const VerifyPrivacyPolicyScreen = ({ navigation }: VerifyPrivacyPolicyScreenProps) => {
  const { t } = useTranslation()

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      title: t('BCSC.Screens.PrivacyInformation'),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  return <PrivacyPolicyContent onLearnMore={handleLearnMore} />
}
