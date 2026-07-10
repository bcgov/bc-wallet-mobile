import { BCState } from '@/store'
import { useDefaultStackOptions, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Developer from '../../screens/Developer'
import { createFloatingHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createAuthSettingsHeaderButton } from '../components/SettingsHeaderButton'
import { useBCSCStack } from '../contexts/BCSCStackContext'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import AccountLanding from '../features/auth/AccountLandingScreen'
import { ConfirmDeviceAuthInfoScreen } from '../features/auth/ConfirmDeviceAuthInfoScreen'
import { DeviceAuthAppResetScreen } from '../features/auth/DeviceAuthAppResetScreen'
import { EnterPINScreen } from '../features/auth/EnterPINScreen'
import { LockoutScreen } from '../features/auth/LockoutScreen'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { ServiceOutage } from '../features/modal/ServiceOutage'
import { OnboardingIntroScreen } from '../features/onboarding/OnboardingIntroScreen'
import { AuthPrivacyPolicyScreen } from '../features/settings/AuthPrivacyPolicyScreen'
import { AuthSettingsScreen } from '../features/settings/AuthSettingsScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { WebViewScreen } from '../features/webview/WebViewScreen'
import { BCSCAuthStackParams, BCSCModals, BCSCScreens, BCSCStacks } from '../types/navigators'

import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { getDefaultModalOptions } from './stack-utils'

/**
 * Slide wrapper for the one-time welcome/intro — the first screen a returning (already-onboarded)
 * user sees on launch. Continue records the intro as seen and replaces this route with the unlock
 * screen, so the transition is a normal in-stack slide rather than a RootStack swap.
 */
const AuthIntroScreen = (): React.ReactElement => {
  const navigation = useNavigation<StackNavigationProp<BCSCAuthStackParams>>()
  return (
    <OnboardingIntroScreen
      onContinue={() => navigation.replace(BCSCScreens.AccountLanding)}
      // Same hidden developer trigger the onboarding intro exposes. AuthStack already registers the
      // Developer screen (AuthDeveloper), so returning users can reach it (e.g. the "Reset Welcome
      // Intro" dev tool) from the intro before unlocking.
      onActivateDeveloper={() => navigation.navigate(BCSCScreens.AuthDeveloper)}
    />
  )
}

/**
 * Renders the auth stack. These screens are shown when the user has an account but is not yet authenticated.
 *
 * @returns {*} {React.ReactElement} The AuthStack component.
 */
const AuthStack = (): React.ReactElement => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCAuthStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [store] = useStore<BCState>()
  // Returning users see the one-time welcome/intro before unlocking; once seen, AuthStack opens
  // straight on the unlock (account landing) screen.
  const showIntro = !store.bcsc.hasSeenOnboardingIntro
  useBCSCStack(BCSCStacks.Auth)

  return (
    <Stack.Navigator
      initialRouteName={showIntro ? BCSCScreens.AuthIntro : BCSCScreens.AccountLanding}
      screenOptions={{
        ...defaultStackOptions,
        headerShadowVisible: false,
        headerLeft: createHeaderBackButton,
        header: createHeaderWithoutBanner,
        headerRight: createFloatingHelpMenuButton({ webViewScreen: BCSCScreens.AuthWebView }),
      }}
    >
      <Stack.Screen
        name={BCSCScreens.AuthIntro}
        component={AuthIntroScreen}
        options={{
          title: '',
          // One-time gate shown before unlock — no back destination.
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.AccountLanding}
        component={AccountLanding}
        options={{
          title: '',
          headerLeft: createAuthSettingsHeaderButton(),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EnterPIN}
        component={EnterPINScreen}
        options={{
          title: 'Enter PIN',
        }}
      />
      {/* TODO (bm): Hook up to show users on first device auth usage */}
      <Stack.Screen
        name={BCSCScreens.DeviceAuthInfo}
        component={ConfirmDeviceAuthInfoScreen}
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name={BCSCScreens.Lockout}
        component={LockoutScreen}
        options={{
          title: '',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.DeviceAuthAppReset}
        component={DeviceAuthAppResetScreen}
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name={BCSCScreens.AuthSettings}
        component={AuthSettingsScreen}
        options={{
          title: t('BCSC.Screens.Settings'),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.AuthWebView}
        component={WebViewScreen}
        options={({ route }) => ({
          title: route.params.title,
        })}
      />
      <Stack.Screen
        name={BCSCScreens.AuthContactUs}
        component={ContactUsScreen}
        options={{
          title: t('BCSC.Screens.ContactUs'),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.AuthPrivacyPolicy}
        component={AuthPrivacyPolicyScreen}
        options={{
          title: t('BCSC.Screens.PrivacyInformation'),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.AuthDeveloper}
        component={Developer}
        options={{
          title: t('Developer.DeveloperMode'),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.PairingConfirmation}
        component={PairingConfirmation}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EditNickname}
        component={EditNicknameScreen}
        options={{
          headerShown: true,
          title: t('BCSC.Screens.Nickname'),
        }}
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

export default AuthStack
