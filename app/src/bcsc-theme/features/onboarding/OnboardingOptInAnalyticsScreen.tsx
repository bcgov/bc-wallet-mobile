import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_LOGIN_PRIVACY_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { OnboardingOptInAnalyticsContent } from './components/OnboardingOptInAnalyticsContent'

interface OnboardingOptInAnalyticsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingOptInAnalytics>
}

/**
 * Opt-In Analytics screen component that allows users to choose whether to participate in analytics data collection.
 * @returns {*} {React.ReactElement} The OnboardingOptInAnalyticsScreen component.
 */
export const OnboardingOptInAnalyticsScreen: React.FC<OnboardingOptInAnalyticsScreenProps> = ({
  navigation,
}: OnboardingOptInAnalyticsScreenProps): React.ReactElement => {
  const { t } = useTranslation()

  const onPress = () => {
    navigation.navigate(BCSCScreens.OnboardingTermsOfUse)
  }

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.AnalyticsLearnMore'),
      url: BC_LOGIN_PRIVACY_URL,
    })
  }

  return <OnboardingOptInAnalyticsContent onPress={onPress} onLearnMore={handleLearnMore} />
}
