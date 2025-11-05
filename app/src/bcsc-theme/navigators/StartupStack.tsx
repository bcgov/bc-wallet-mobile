import Splash from '@/screens/Splash'
import { useTheme, WalletSecret } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ActivityIndicator, SafeAreaView } from 'react-native'
import { BCSCScreens } from '../types/navigators'

interface StartupStackProps {
  initializeAgent: (walletSecret: WalletSecret) => Promise<void>
}

/**
 * Renders the startup stack for the BCSC theme, including the splash screen and authentication flow.
 *
 * This is a collection of screens that are shown to the user every time the app is launched.
 *
 * Screens in this stack should include:
 *    - Loading screen
 *    - Splash screen
 *    - Biometrics
 *    - PIN entry
 *
 * @returns {*} {JSX.Element} The StartupStack component.
 */
export const StartupStack = (props: StartupStackProps) => {
  const theme = useTheme()
  const Stack = createStackNavigator()

  const SplashScreen = useCallback(() => <Splash initializeAgent={props.initializeAgent} />, [props.initializeAgent])

  const LoadingView = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.ColorPalette.brand.primaryBackground }}>
      <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </SafeAreaView>
  )

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.Loading}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name={BCSCScreens.Loading} component={LoadingView} />

      <Stack.Screen name={BCSCScreens.Splash} component={SplashScreen} />

      {/* TODO (MD): Add Biometrics, PIN entry and other auth related screens */}
    </Stack.Navigator>
  )
}
