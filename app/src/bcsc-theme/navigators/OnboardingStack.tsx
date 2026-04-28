import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE, HelpCentreUrl } from '@/constants'
import Developer from '@/screens/Developer'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createHeaderRightMoreButton } from '../components/HeaderRightMoreButton'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createOnboardingHelpHeaderButton } from '../components/HelpHeaderButton'
import { useBCSCStack } from '../contexts/BCSCStackContext'
import TransferInformationScreen from '../features/account-transfer/transferee/TransferInformationScreen'
import { OnboardingRemoveAccountConfirmationScreen } from '../features/account/RemoveAccountConfirmationScreen'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { ServiceOutage } from '../features/modal/ServiceOutage'
import AccountSetupScreen from '../features/onboarding/AccountSetupScreen'
import { CreatePINScreen } from '../features/onboarding/CreatePINScreen'
import { NotificationsScreen } from '../features/onboarding/NotificationsScreen'
import { OnboardingOptInAnalyticsScreen } from '../features/onboarding/OnboardingOptInAnalyticsScreen'
import { OnboardingPrivacyPolicyScreen } from '../features/onboarding/OnboardingPrivacyPolicyScreen'
import { SecureAppScreen } from '../features/onboarding/SecureAppScreen'
import { TermsOfUseScreen } from '../features/onboarding/TermsOfUseScreen'
import { WebViewScreen } from '../features/webview/WebViewScreen'
import { BCSCModals, BCSCOnboardingStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {React.ReactElement} The OnboardingStack component.
 */
const OnboardingStack = (): React.ReactElement => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCOnboardingStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)
  useBCSCStack(BCSCStacks.Onboarding)

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.OnboardingAccountSetup}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: false,
        title: '',
        headerShadowVisible: true,
        headerBackTitleVisible: false,
        headerBackTestID: testIdWithKey('Back'),
        headerBackAccessibilityLabel: t('Global.Back'),
        headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
        headerLeft: createHeaderBackButton,
        header: createHeaderWithoutBanner,
        headerRight: createHeaderRightMoreButton,
      }}
    >
      <Stack.Screen
        name={BCSCScreens.OnboardingAccountSetup}
        component={AccountSetupScreen}
        options={{ headerShown: true, headerLeft: () => null }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingDeveloper}
        component={Developer}
        options={{
          title: t('Developer.DeveloperMode'),
          headerShown: true,
        }}
      />
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
          title: t('BCSC.Settings.Analytics'),
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
          title: t('BCSC.Onboarding.NotificationsTitle'),
          headerShown: true,
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
        name={BCSCScreens.OnboardingCreatePIN}
        component={CreatePINScreen}
        options={{
          title: t('BCSC.Onboarding.SecureAppPINTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingWebView}
        component={WebViewScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.title,
        })}
      />
      <Stack.Screen
        name={BCSCScreens.TransferAccountInformation}
        component={TransferInformationScreen}
        options={{
          title: t('BCSC.TransferInformation.TransferAccount'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.OnboardingRemoveAccountConfirmation}
        component={OnboardingRemoveAccountConfirmationScreen}
        options={() => ({
          headerShown: true,
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

      <Stack.Screen
        name={BCSCModals.ServiceOutage}
        component={ServiceOutage}
        options={{
          ...getDefaultModalOptions(t('BCSC.Title')),
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

export default OnboardingStack
