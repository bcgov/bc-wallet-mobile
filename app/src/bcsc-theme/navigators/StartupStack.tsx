import {
  DispatchAction,
  testIdWithKey,
  useAuth,
  useDefaultStackOptions,
  useStore,
  useTheme,
  WalletSecret,
} from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BCSCScreens } from '../types/navigators'
import Splash from '@/screens/Splash'
import { useEffect } from 'react'
import { BCState } from '@/store'

const TEMP_DEVELOPMENT_PIN = '111111'

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
  const auth = useAuth()
  const [store, dispatch] = useStore<BCState>()

  // ONBOARDING PATCH: Show Splash screen only if walletSecret exists (prevents race condition, walletSecret must be set before showing Splash)
  const SplashScreen = () => (auth.walletSecret ? <Splash initializeAgent={props.initializeAgent} /> : <></>)

  /**
   * ONBOARDING PATCH
   *
   * TODO (MD) REMOVE: TEMPORARY CODE FOR ONBOARDING DEVELOPMENT PURPOSES
   *
   * Why? There are some development notes regarding PIN creation and authentication in BCSC.
   *
   * This useEffect is a temp patch to allow developers to bypass the PIN creation
   * and authentication screens during onboarding. It automatically sets a default PIN,
   * and marks the user as authenticated.
   */
  useEffect(() => {
    const asyncEffect = async () => {
      dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [true] })

      if (!store.onboarding.didCreatePIN) {
        await auth.setPIN(TEMP_DEVELOPMENT_PIN)
        dispatch({ type: DispatchAction.DID_CREATE_PIN, payload: [true] })
      }

      await auth.getWalletSecret()
    }

    asyncEffect()
  }, [])

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
