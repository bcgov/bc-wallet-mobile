import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator, Header } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { BCSCModals, BCSCScreens } from '../types/navigators'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'

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
        header: Header,
      }}
    >
      <Stack.Screen name={BCSCScreens.OnboardingIntroCarousel} component={IntroCarouselScreen} />

      <Stack.Screen
        name={BCSCScreens.PrivacyPolicy}
        component={PrivacyPolicyScreen}
        options={{
          title: t('Unified.Onboarding.PrivacyPolicyTitle'),
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
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  )
}

export default OnboardingStack
