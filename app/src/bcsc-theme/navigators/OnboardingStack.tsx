import { createStackNavigator } from '@react-navigation/stack'
import { BCSCScreens } from '../types/navigators'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { useTranslation } from 'react-i18next'
import { WorkflowEngineProvider } from '@/contexts/WorkflowEngineContext'
import { createOnboardingHeaderBackButton } from '../features/onboarding/components/OnboardingHeaderBackButton'
import { OnboardingWorkflow } from '../features/onboarding/utils/onboarding-workflow'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {JSX.Element} The OnboardingStack component.
 */
const OnboardingStack = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const initialRouteName = OnboardingWorkflow[0].screen

  return (
    <WorkflowEngineProvider workflowSteps={OnboardingWorkflow}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerShadowVisible: false,
          headerBackTestID: testIdWithKey('Back'),
          headerBackAccessibilityLabel: t('Global.Back'),
        }}
      >
        <Stack.Screen name={BCSCScreens.OnboardingIntroCarouselScreen} component={IntroCarouselScreen} />

        <Stack.Screen
          name={BCSCScreens.OnboardingPrivacyPolicyScreen}
          component={PrivacyPolicyScreen}
          options={{
            title: t('Unified.Onboarding.PrivacyPolicyTitle'),
            headerShown: true,
            headerLeft: createOnboardingHeaderBackButton(),
          }}
        />

        <Stack.Screen
          name={BCSCScreens.OnboardingTermsOfUseScreen}
          component={TermsOfUseScreen}
          options={{
            title: t('Unified.Onboarding.TermsOfUseTitle'),
            headerShown: true,
            headerLeft: createOnboardingHeaderBackButton(),
          }}
        />

        <Stack.Screen name={BCSCScreens.OnboardingNotificationsScreen} component={NotificationsScreen} />

        <Stack.Screen
          name={BCSCScreens.OnboardingSecureAppScreen}
          component={SecureAppScreen}
          options={{
            headerShown: true,
            headerLeft: createOnboardingHeaderBackButton(),
          }}
        />
      </Stack.Navigator>
    </WorkflowEngineProvider>
  )
}

export default OnboardingStack
