import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_LOGIN_PRIVACY_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

type MainPrivacyPolicyScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainPrivacyPolicy>
}

/**
 * Privacy Policy screen for the Main stack.
 */
export const MainPrivacyPolicyScreen = ({ navigation }: MainPrivacyPolicyScreenProps) => {
  const { t } = useTranslation()

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.MainWebView, {
      title: t('BCSC.Screens.PrivacyInformation'),
      url: BC_LOGIN_PRIVACY_URL,
    })
  }

  return <PrivacyPolicyContent onLearnMore={handleLearnMore} />
}
