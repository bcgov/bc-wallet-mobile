import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator, StackHeaderProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { BCSCScreens } from '../types/navigators'
import HeaderWithBanner from '../components/HeaderWithBanner'
import { useCallback } from 'react'

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

  const HeaderWithoutBanner = useCallback(
    (props: StackHeaderProps) => <HeaderWithBanner {...props} hideNotificationBanner />,
    []
  )

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
        header: HeaderWithoutBanner,
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
    </Stack.Navigator>
  )
}

export default OnboardingStack
