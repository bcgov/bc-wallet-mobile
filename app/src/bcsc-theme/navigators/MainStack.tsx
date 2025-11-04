import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useBCSCApiClient } from '../hooks/useBCSCApiClient'
import { createHeaderWithBanner } from '../components/HeaderWithBanner'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { createWebviewHeaderBackButton } from '../components/WebViewBackButton'
import TransferQRDisplayScreen from '../features/account-transfer/TransferQRDisplayScreen'
import TransferQRInformationScreen from '../features/account-transfer/TransferQRInformationScreen'
import TransferSuccessScreen from '../features/account-transfer/TransferSuccessScreen'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { MainContactUsScreen } from '../features/settings/MainContactUsScreen'
import { ForgetAllPairingsScreen } from '../features/settings/ForgetAllPairingsScreen'
import { MainHelpCentreScreen } from '../features/settings/MainHelpCentreScreen'
import { MainSettingsScreen } from '../features/settings/MainSettingsScreen'
import { SettingsPrivacyPolicyScreen } from '../features/settings/SettingsPrivacyPolicyScreen'
import { MainWebViewScreen } from '../features/webview/MainWebViewScreen'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const theme = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const client = useBCSCApiClient()
  const Stack = createStackNavigator<BCSCMainStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)
  useSystemChecks(SystemCheckScope.MAIN_STACK)

  const handleManageDevices = useCallback(() => {
    navigation.navigate(BCSCScreens.MainWebView, {
      url: `${client.baseURL}/account/embedded/devices`,
      title: t('Unified.Screens.ManageDevices'),
    })
  }, [client.baseURL, navigation, t])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator
        initialRouteName={BCSCStacks.Tab}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerBackTestID: testIdWithKey('Back'),
          headerShadowVisible: false,
          header: createHeaderWithBanner(handleManageDevices),
        }}
      >
        <Stack.Screen name={BCSCStacks.Tab} component={BCSCTabStack} />
        <Stack.Screen
          name={BCSCScreens.EditNickname}
          component={EditNicknameScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: createWebviewHeaderBackButton(navigation),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainSettings}
          component={MainSettingsScreen}
          options={{
            headerShown: true,
            title: t('Screens.Settings'),
            headerBackTestID: testIdWithKey('Back'),
          }}
        />
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
          name={BCSCScreens.MainWebView}
          component={MainWebViewScreen}
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
          name={BCSCScreens.TransferAccountQRInformation}
          component={TransferQRInformationScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.TransferInformation.TransferAccount'),
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
          name={BCSCScreens.TransferAccountSuccess}
          component={TransferSuccessScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.ServiceLogin}
          component={ServiceLoginScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainContactUs}
          component={MainContactUsScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.Screens.ContactUs'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainHelpCentre}
          component={MainHelpCentreScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.Screens.HelpCentre'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainPrivacyPolicy}
          component={SettingsPrivacyPolicyScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.Screens.PrivacyInformation'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.ForgetAllPairings}
          component={ForgetAllPairingsScreen}
          options={() => ({
            headerShown: true,
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
