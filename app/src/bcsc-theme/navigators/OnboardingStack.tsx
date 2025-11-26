import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createOnboardingHelpHeaderButton } from '../components/HelpHeaderButton'
import { createMainWebviewHeaderBackButton } from '../components/WebViewBackButton'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { IntroCarouselScreen } from '../features/onboarding/IntroCarousel'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { OnboardingOptInAnalyticsScreen } from '../features/onboarding/OnboardingOptInAnalyticsScreen'
import { OnboardingPrivacyPolicyScreen } from '../features/onboarding/OnboardingPrivacyPolicyScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { OnboardingWebViewScreen } from '../features/webview/OnboardingWebViewScreen'
import { BCSCModals, BCSCOnboardingStackParams, BCSCScreens } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {JSX.Element} The OnboardingStack component.
 */
const OnboardingStack = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCOnboardingStackParams>()
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
          title: t('BCSC.Onboarding.PrivacyPolicyTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingOptInAnalytics}
        component={OnboardingOptInAnalyticsScreen}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingTermsOfUse}
        component={TermsOfUseScreen}
        options={{
          title: t('BCSC.Onboarding.TermsOfUseTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingNotifications}
        component={NotificationsScreen}
        options={{
          title: t('BCSC.Onboarding.NotificationsHeader'),
          headerShown: true,
          headerBackTestID: testIdWithKey('Back'),
          headerBackAccessibilityLabel: t('Global.Back'),
          headerRight: createOnboardingHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingSecureApp}
        component={SecureAppScreen}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingWebView}
        component={OnboardingWebViewScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.title,
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: createMainWebviewHeaderBackButton(),
        })}
      />

      {/* React navigation docs suggest modals at bottom of stack */}
      <Stack.Screen
        name={BCSCModals.InternetDisconnected}
        component={InternetDisconnected}
        options={{
          ...getDefaultModalOptions(t('BCSC.Title')),
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name={BCSCModals.MandatoryUpdate}
        component={MandatoryUpdate}
        options={{
          ...getDefaultModalOptions(t('BCSC.Title')),
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

export default OnboardingStack
