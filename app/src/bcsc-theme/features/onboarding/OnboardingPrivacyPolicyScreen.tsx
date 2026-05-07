import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { PrivacyPolicyContent } from './components/PrivacyPolicyContent'

interface OnboardingPrivacyPolicyScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingPrivacyPolicy>
}

/**
 * Privacy Policy screen component that informs users about the app's privacy practices.
 *
 * @returns {*} {React.ReactElement} The OnboardingPrivacyPolicyScreen component.
 */
export const OnboardingPrivacyPolicyScreen = ({ navigation }: OnboardingPrivacyPolicyScreenProps) => {
  const { t } = useTranslation()

  const onPress = () => {
    navigation.navigate(BCSCScreens.OnboardingTermsOfUse)
  }

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        onPress={onPress}
        testID={testIdWithKey('Continue')}
        accessibilityLabel={t('Global.Continue')}
      />
    </ControlContainer>
  )

  return <PrivacyPolicyContent onLearnMore={handleLearnMore} controls={controls} />
}
