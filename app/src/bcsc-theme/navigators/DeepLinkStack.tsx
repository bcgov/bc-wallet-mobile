import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { BCSCOnboardingStackParams, BCSCScreens } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {JSX.Element} The OnboardingStack component.
 */
const DeepLinkStack = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCOnboardingStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.ServiceLogin}
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
      <Stack.Screen
        name={BCSCScreens.ServiceLogin}
        component={ServiceLoginScreen}
        options={{
          ...getDefaultModalOptions(t('HelloWorld')),
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  )
}

export default DeepLinkStack
