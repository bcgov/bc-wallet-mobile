import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Developer from '../../screens/Developer'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createAuthSettingsHeaderButton } from '../components/SettingsHeaderButton'
import AccountSelector from '../features/auth/AccountSelectorScreen'
import { ConfirmDeviceAuthInfoScreen } from '../features/auth/ConfirmDeviceAuthInfoScreen'
import { DeviceAuthAppResetScreen } from '../features/auth/DeviceAuthAppResetScreen'
import { EnterPINScreen } from '../features/auth/EnterPINScreen'
import { LockoutScreen } from '../features/auth/LockoutScreen'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { AuthSettingsScreen } from '../features/settings/AuthSettingsScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { SettingsPrivacyPolicyScreen } from '../features/settings/SettingsPrivacyPolicyScreen'
import { AuthWebViewScreen } from '../features/webview/AuthWebViewScreen'
import { BCSCAuthStackParams, BCSCModals, BCSCScreens } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'

/**
 * Renders the auth stack. These screens are shown when the user has an account but is not yet authenticated.
 *
 * @returns {*} {JSX.Element} The AuthStack component.
 */
const AuthStack = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCAuthStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.AccountSelector}
      screenOptions={{
        ...defaultStackOptions,
        headerShadowVisible: false,
        header: createHeaderWithoutBanner,
      }}
    >
      <Stack.Screen
        name={BCSCScreens.AccountSelector}
        component={AccountSelector}
        options={{
          title: t('BCSC.Title'),
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
        component={AuthWebViewScreen}
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
        component={SettingsPrivacyPolicyScreen}
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

export default AuthStack
