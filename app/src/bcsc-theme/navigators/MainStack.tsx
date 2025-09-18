import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useMemo } from 'react'
import { View } from 'react-native'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { createWebviewHeaderBackButton } from '../components/WebViewBackButton'
import TransferInformationScreen from '../features/account-transfer/TransferInformationScreen'
import TransferInstructionsScreen from '../features/account-transfer/TransferInstructionsScreen'
import TransferQRDisplayScreen from '../features/account-transfer/TransferQRDisplayScreen'
import TransferQRScannerScreen from '../features/account-transfer/TransferQRScannerScreen'
import TransferStepsScreen from '../features/account-transfer/TransferStepsScreen'
import TransferSuccessScreen from '../features/account-transfer/TransferSuccessScreen'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import WebViewScreen from '../features/webview/WebViewScreen'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

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
          name={BCSCScreens.TransferAccountInformation}
          component={TransferInformationScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.TransferAccountInstructions}
          component={TransferInstructionsScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.TransferAccountQRDisplay}
          component={TransferQRDisplayScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.TransferAccountQRScan}
          component={TransferQRScannerScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.TransferAccountSteps}
          component={TransferStepsScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.TransferAccountSuccess}
          component={TransferSuccessScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.ServiceLoginScreen}
          component={ServiceLoginScreen}
          options={() => ({
            headerShown: true,
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
