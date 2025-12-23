import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import AccountSelector from '../features/auth/AccountSelectorScreen'
import { ConfirmDeviceAuthInfoScreen } from '../features/auth/ConfirmDeviceAuthInfoScreen'
import { DeviceAuthAppResetScreen } from '../features/auth/DeviceAuthAppResetScreen'
import { EnterPINScreen } from '../features/auth/EnterPINScreen'
import { LockoutScreen } from '../features/auth/LockoutScreen'
import { BCSCAuthStackParams, BCSCScreens } from '../types/navigators'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {JSX.Element} The OnboardingStack component.
 */
const AuthStack = (): JSX.Element => {
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCAuthStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)

  // TODO (bm): Add settings, modals, etc. as needed
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
          title: 'BC Services Card',
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
    </Stack.Navigator>
  )
}

export default AuthStack
