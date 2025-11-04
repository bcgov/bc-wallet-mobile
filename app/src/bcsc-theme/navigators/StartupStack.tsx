import Splash from '@/screens/Splash'
import { testIdWithKey, useDefaultStackOptions, useTheme, WalletSecret } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
 *    - Splash screen
 *    - Biometrics
 *    - PIN entry
 *
 * @returns {*} {JSX.Element} The StartupStack component.
 */
export const StartupStack = (props: StartupStackProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator()
  const defaultStackOptions = useDefaultStackOptions(theme)

  const SplashScreen = useCallback(() => <Splash initializeAgent={props.initializeAgent} />, [props.initializeAgent])

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.Splash}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: false,
        title: '',
        headerShadowVisible: false,
        headerBackTestID: testIdWithKey('Back'),
        headerBackAccessibilityLabel: t('Global.Back'),
      }}
    >
      <Stack.Screen name={BCSCScreens.Splash} component={SplashScreen} />

      {/* TODO (MD): Add Biometrics, PIN entry and other auth related screens */}
    </Stack.Navigator>
  )
}
