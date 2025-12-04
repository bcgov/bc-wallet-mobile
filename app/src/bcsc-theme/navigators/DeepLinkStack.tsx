import { useDeepLinkViewModel } from '@/contexts/DeepLinkViewModelContext'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { BCSCOnboardingStackParams, BCSCScreens } from '../types/navigators'

/**
 * Renders the onboarding stack. These screens are shown to the user only **once**, when they first install the app.
 *
 * @returns {*} {JSX.Element} The OnboardingStack component.
 */
const DeepLinkStack = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const viewModel = useDeepLinkViewModel()
  const Stack = createStackNavigator<BCSCOnboardingStackParams>()
  const defaultStackOptions = useDefaultStackOptions(theme)

  // Get the pending deep link data without consuming it yet
  const { serviceTitle, pairingCode } = viewModel.getPendingDeepLink() ?? {}

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
        initialParams={
          serviceTitle || pairingCode
            ? {
                serviceTitle,
                pairingCode,
              }
            : undefined
        }
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

export default DeepLinkStack
