import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

interface SettingsPrivacyPolicyScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainPrivacyPolicy>
}
/**
 * Privacy Policy screen component that informs users about the app's privacy practices,
 * to be shown in the Settings section of the app with no continue button.
 *
 * @returns {*} {JSX.Element} The SettingsPrivacyPolicyScreen component.
 */
export const SettingsPrivacyPolicyScreen: React.FC<SettingsPrivacyPolicyScreenProps> = ({
  navigation,
}: SettingsPrivacyPolicyScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.MainWebView, {
      title: t('BCSC.Screens.PrivacyInformation'),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  const scrollContentStyle = {
    gap: theme.Spacing.lg,
  }

  return (
    <ScreenWrapper scrollViewContainerStyle={scrollContentStyle}>
      <PrivacyPolicyContent onLearnMore={handleLearnMore} />
    </ScreenWrapper>
  )
}
