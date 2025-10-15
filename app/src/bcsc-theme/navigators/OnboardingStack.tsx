import { createStackNavigator } from '@react-navigation/stack'
import { BCSCScreens } from '../types/navigators'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { useTranslation } from 'react-i18next'

const OnboardingStack: React.FC = () => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.OnboardingIntroCarouselScreen}
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

      <Stack.Screen name={BCSCScreens.OnboardingCreatePINScreen} component={SecureAppScreen} />
    </Stack.Navigator>
  )
}

export default OnboardingStack
