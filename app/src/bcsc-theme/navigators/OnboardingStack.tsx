import { createStackNavigator } from '@react-navigation/stack'
import { BCSCScreens } from '../types/navigators'
import { testIdWithKey, useDefaultStackOptions, useStore, useTheme } from '@bifold/core'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { useTranslation } from 'react-i18next'
import { OnboardingWorkflow } from '@/workflow/workflow-definitions/onboarding-workflow'
import { WorkflowEngineProvider } from '@/workflow/WorkflowEngineContext'
import { createWorkflowEngineBackHeaderButton } from '@/workflow/WorkflowEngineHeaderBackButton'
import { BCDispatchAction } from '@/store'

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
  const [, dispatch] = useStore()

  return (
    <WorkflowEngineProvider
      workflowDefinition={OnboardingWorkflow}
      initialWorkflowStep={OnboardingWorkflow.Intro}
      onWorkflowComplete={() => {
        dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_ONBOARDING, payload: [true] })
      }}
    >
      <Stack.Navigator
        initialRouteName={OnboardingWorkflow.Intro.screen}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerShadowVisible: false,
          headerBackTestID: testIdWithKey('Back'),
          headerBackAccessibilityLabel: t('Global.Back'),
          headerLeft: createWorkflowEngineBackHeaderButton(),
        }}
      >
        <Stack.Screen name={BCSCScreens.OnboardingIntroCarouselScreen} component={IntroCarouselScreen} />

        <Stack.Screen
          name={BCSCScreens.OnboardingPrivacyPolicyScreen}
          component={PrivacyPolicyScreen}
          options={{
            title: t('Unified.Onboarding.PrivacyPolicyTitle'),
            headerShown: true,
          }}
        />

        <Stack.Screen
          name={BCSCScreens.OnboardingTermsOfUseScreen}
          component={TermsOfUseScreen}
          options={{
            title: t('Unified.Onboarding.TermsOfUseTitle'),
            headerShown: true,
          }}
        />

        <Stack.Screen name={BCSCScreens.OnboardingNotificationsScreen} component={NotificationsScreen} />

        <Stack.Screen
          name={BCSCScreens.OnboardingSecureAppScreen}
          component={SecureAppScreen}
          options={{
            headerShown: true,
          }}
        />
      </Stack.Navigator>
    </WorkflowEngineProvider>
  )
}

export default OnboardingStack
