import { createStackNavigator } from '@react-navigation/stack'
import { BCSCScreens } from '../types/navigators'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { useTranslation } from 'react-i18next'
import { OnboardingWorkflow } from '@/workflow/workflow-definitions/onboarding-workflow'
import { WorkflowEngineProvider } from '@/workflow/WorkflowEngineContext'
import { createWorkflowEngineBackHeaderButton } from '@/workflow/WorkflowEngineHeaderBackButton'

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

  return (
    <WorkflowEngineProvider workflowDefinition={OnboardingWorkflow} initialWorkflowStep={OnboardingWorkflow.Intro}>
      <Stack.Navigator
        initialRouteName={OnboardingWorkflow.Intro.screen}
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
            headerLeft: createWorkflowEngineBackHeaderButton(),
          }}
        />

        <Stack.Screen
          name={BCSCScreens.OnboardingTermsOfUseScreen}
          component={TermsOfUseScreen}
          options={{
            title: t('Unified.Onboarding.TermsOfUseTitle'),
            headerShown: true,
            headerLeft: createWorkflowEngineBackHeaderButton(),
          }}
        />

        <Stack.Screen name={BCSCScreens.OnboardingNotificationsScreen} component={NotificationsScreen} />

        <Stack.Screen
          name={BCSCScreens.OnboardingSecureAppScreen}
          component={SecureAppScreen}
          options={{
            headerShown: true,
            headerLeft: createWorkflowEngineBackHeaderButton(),
          }}
        />
      </Stack.Navigator>
    </WorkflowEngineProvider>
  )
}

export default OnboardingStack
