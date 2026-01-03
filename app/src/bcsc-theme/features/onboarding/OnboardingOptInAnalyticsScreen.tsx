import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useWorkflowNavigation } from '@/contexts/WorkflowNavigationContext'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { OnboardingOptInAnalyticsContent } from './components/OnboardingOptInAnalyticsContent'

interface OnboardingOptInAnalyticsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingOptInAnalytics>
}

/**
 * Opt-In Analytics screen component that allows users to choose whether to participate in analytics data collection.
 * @returns {*} {JSX.Element} The OnboardingOptInAnalyticsScreen component.
 */
export const OnboardingOptInAnalyticsScreen: React.FC<OnboardingOptInAnalyticsScreenProps> = ({
  navigation,
}: OnboardingOptInAnalyticsScreenProps): JSX.Element => {
  const { goToNextScreen } = useWorkflowNavigation()
  const onPress = () => {
    goToNextScreen()
  }

  return <OnboardingOptInAnalyticsContent onPress={onPress} />
}
