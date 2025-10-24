import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useStore, useTheme, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { createWebviewHeaderBackButton } from '../components/WebViewBackButton'
import TransferQRDisplayScreen from '../features/account-transfer/TransferQRDisplayScreen'
import TransferQRInformationScreen from '../features/account-transfer/TransferQRInformationScreen'
import TransferSuccessScreen from '../features/account-transfer/TransferSuccessScreen'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import Settings from '../features/settings/Settings'
import WebViewScreen from '../features/webview/WebViewScreen'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import { DeviceCountStartupCheck, runStartupChecks, ServerStatusStartupCheck } from '@/services/StartupChecks'
import useApi from '../api/hooks/useApi'

const MainStack: React.FC = () => {
  const api = useApi()
  const { currentStep } = useTour()
  const theme = useTheme()
  const { t } = useTranslation()
  const Stack = createStackNavigator<BCSCRootStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [, dispatch] = useStore()
  const startupCheckRef = useRef(false)

  // TODO (MD): Move into its own file (useMainStackStartupChecks or useStartupChecks)
  useEffect(() => {
    const asyncEffect = async () => {
      if (startupCheckRef.current) {
        return
      }

      await runStartupChecks([
        new ServerStatusStartupCheck({
          dispatch,
          bannerTitle: t('StartupChecks.ServerStatusBannerTitle'),
          getServerStatus: () => api.config.getServerStatus(),
        }),
        new DeviceCountStartupCheck({
          dispatch,
          bannerTitle: t('StartupChecks.DeviceLimitBannerTitle'),
          getIdToken: () => api.token.getCachedIdTokenMetadata({ refreshCache: true }),
        }),
      ])

      startupCheckRef.current = true
    }

    asyncEffect()
  }, [api.config, api.token, dispatch, t])

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
          name={BCSCScreens.EditNickname}
          component={EditNicknameScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: createWebviewHeaderBackButton(navigation),
          })}
        />

        <Stack.Screen
          name={BCSCScreens.Settings}
          component={Settings}
          options={{
            headerShown: true,
            title: t('Screens.Settings'),
            headerBackTestID: testIdWithKey('Back'),
            headerShadowVisible: false,
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
          name={BCSCScreens.TransferAccountQRInformation}
          component={TransferQRInformationScreen}
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
