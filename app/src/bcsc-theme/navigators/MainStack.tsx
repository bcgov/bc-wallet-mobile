import { testIdWithKey, useDefaultStackOptions, useTheme, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useMemo } from 'react'
import { View } from 'react-native'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import WebViewScreen from '../features/webview/WebViewScreen'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { HelpCentreUrl } from '@/constants'
import { createWebviewHeaderBackButton } from '../components/WebViewBackButton'
import { ServiceDetailsScreen } from '../features/services/ServiceDetailsScreen'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCRootStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator
        initialRouteName={BCSCStacks.TabStack}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerBackTestID: testIdWithKey('Back'),
        }}
      >
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
        <Stack.Screen
          name={BCSCScreens.ManualPairingCode}
          component={ManualPairingCode}
          options={() => ({
            headerShown: true,
            headerBackTitleVisible: false,
            headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.WebView}
          component={WebViewScreen}
          options={({ route, navigation }) => ({
            headerShown: true,
            title: route.params.title,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: createWebviewHeaderBackButton(navigation),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.PairingConfirmation}
          component={PairingConfirmation}
          options={() => ({
            headerShown: true,
            headerLeft: () => null,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.RemoveAccountConfirmation}
          component={RemoveAccountConfirmationScreen}
          options={() => ({
            headerShown: true,
            headerBackTitleVisible: false,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.ServiceDetailsScreen}
          component={ServiceDetailsScreen}
          options={() => ({
            headerShown: true,
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
