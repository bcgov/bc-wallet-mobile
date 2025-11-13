import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { OnboardingOptInAnalyticsScreen } from '../features/onboarding/OnboardingOptInAnalyticsScreen'
import { OnboardingPrivacyPolicyScreen } from '../features/onboarding/OnboardingPrivacyPolicyScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { BCSCModals, BCSCScreens } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'

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
    <Stack.Navigator
      initialRouteName={BCSCScreens.OnboardingIntroCarousel}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: false,
        title: '',
        headerShadowVisible: false,
        headerBackTestID: testIdWithKey('Back'),
        headerBackAccessibilityLabel: t('Global.Back'),
        header: createHeaderWithoutBanner,
      }}
    >
      <Stack.Screen name={BCSCScreens.OnboardingIntroCarousel} component={IntroCarouselScreen} />
      <Stack.Screen
        name={BCSCScreens.OnboardingPrivacyPolicy}
        component={OnboardingPrivacyPolicyScreen}
        options={{
          title: t('Unified.Onboarding.PrivacyPolicyTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingOptInAnalytics}
        component={OnboardingOptInAnalyticsScreen}
        options={{
          title: t('Unified.Onboarding.AnalyticsTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingTermsOfUse}
        component={TermsOfUseScreen}
        options={{
          title: t('Unified.Onboarding.TermsOfUseTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen name={BCSCScreens.OnboardingNotifications} component={NotificationsScreen} />
      <Stack.Screen
        name={BCSCScreens.OnboardingSecureApp}
        component={SecureAppScreen}
        options={{
          headerShown: true,
        }}
      />

      {/* React navigation docs suggest modals at bottom of stack */}
      <Stack.Screen
        name={BCSCModals.InternetDisconnected}
        component={InternetDisconnected}
        options={{
          ...getDefaultModalOptions(t('Unified.BCSC')),
          gestureEnabled: false, // Disable swipe to dismiss
        }}
      />

      <Stack.Screen
        name={BCSCModals.MandatoryUpdate}
        component={MandatoryUpdate}
        options={{
          ...getDefaultModalOptions(t('Unified.BCSC')),
          gestureEnabled: false, // Disable swipe to dismiss
        }}
      />
    </Stack.Navigator>
  )
}

export default OnboardingStack
