import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE, HelpCentreUrl } from '@/constants'
import { testIdWithKey, TOKENS, useDefaultStackOptions, useServices, useTheme, useTour } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Developer from '../../screens/Developer'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createMainHelpHeaderButton } from '../components/HelpHeaderButton'
import { createMainWebviewHeaderBackButton } from '../components/WebViewBackButton'
import TransferQRDisplayScreen from '../features/account-transfer/transferer/TransferQRDisplayScreen'
import TransferQRInformationScreen from '../features/account-transfer/transferer/TransferQRInformationScreen'
import TransferSuccessScreen from '../features/account-transfer/transferer/TransferSuccessScreen'
import { AccountExpiredScreen } from '../features/account/AccountExpiredScreen'
import { AccountRenewalFinalWarningScreen } from '../features/account/AccountRenewalFinalWarningScreen'
import { AccountRenewalFirstWarningScreen } from '../features/account/AccountRenewalFirstWarningScreen'
import { AccountRenewalInformationScreen } from '../features/account/AccountRenewalInformationScreen'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import { DeviceInvalidated } from '../features/modal/DeviceInvalidated'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { usePairingService } from '../features/pairing'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { AutoLockScreen } from '../features/settings/AutoLockScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { ForgetAllPairingsScreen } from '../features/settings/ForgetAllPairingsScreen'
import { MainSettingsScreen } from '../features/settings/MainSettingsScreen'
import { SettingsPrivacyPolicyScreen } from '../features/settings/SettingsPrivacyPolicyScreen'
import { MainLoadingScreen } from '../features/splash-loading/MainLoadingScreen'
import { MainWebViewScreen } from '../features/webview/MainWebViewScreen'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { BCSCMainStackParams, BCSCModals, BCSCScreens, BCSCStacks } from '../types/navigators'
import { getDefaultModalOptions } from './stack-utils'
import BCSCTabStack from './TabStack'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const theme = useTheme()
  const { t } = useTranslation()
  const Stack = createStackNavigator<BCSCMainStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)
  const pairingService = usePairingService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  // Consume any cold-start pairing request once and use it to seed the initial route
  const [pendingPairing] = useState(() => pairingService.consumePendingPairing())
  const pairingInitialParams = useMemo(() => {
    if (!pendingPairing) {
      return undefined
    }

    const { serviceTitle, pairingCode } = pendingPairing

    if (!serviceTitle || !pairingCode) {
      logger?.error(
        `[MainStack] Pending pairing missing fields: serviceTitle=${serviceTitle ?? 'missing'}, pairingCode=${
          pairingCode ?? 'missing'
        }`,
      )
      return undefined
    }

    return {
      serviceTitle,
      pairingCode,
    }
  }, [logger, pendingPairing])
  const initialRouteName = pairingInitialParams ? BCSCScreens.ServiceLogin : BCSCScreens.MainLoading
  useSystemChecks(SystemCheckScope.MAIN_STACK)

  useEffect(() => {
    const unsubscribe = pairingService.onNavigationRequest(({ screen, params }) => {
      if (screen === BCSCScreens.ServiceLogin) {
        navigation.navigate(BCSCScreens.ServiceLogin, params as BCSCMainStackParams[BCSCScreens.ServiceLogin])
        return
      }
    })

    return unsubscribe
  }, [pairingService, navigation])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerBackTestID: testIdWithKey('Back'),
          headerShadowVisible: false,
          headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
          headerLeft: createHeaderBackButton,
          header: createHeaderWithoutBanner,
        }}
      >
        <Stack.Screen name={BCSCScreens.MainLoading} component={MainLoadingScreen} />
        <Stack.Screen
          name={BCSCStacks.Tab}
          component={BCSCTabStack}
          options={{
            animationEnabled: false,
          }}
        />
        <Stack.Screen
          name={BCSCScreens.EditNickname}
          component={EditNicknameScreen}
          options={{
            headerShown: true,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: createMainWebviewHeaderBackButton(),
          }}
        />
        <Stack.Screen
          name={BCSCScreens.MainSettings}
          component={MainSettingsScreen}
          options={{
            headerShown: true,
            title: t('BCSC.Screens.Settings'),
            headerBackTestID: testIdWithKey('Back'),
          }}
        />
        <Stack.Screen
          name={BCSCScreens.MainAutoLock}
          component={AutoLockScreen}
          options={{
            headerShown: true,
            title: t('BCSC.Settings.AutoLockTime'),
            headerBackTestID: testIdWithKey('Back'),
          }}
        />
        <Stack.Screen
          name={BCSCScreens.ManualPairingCode}
          component={ManualPairingCode}
          options={() => ({
            headerShown: true,
            headerBackTitleVisible: false,
            headerRight: createMainHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainWebView}
          component={MainWebViewScreen}
          options={({ route }) => ({
            headerShown: true,
            title: route.params.title,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: createMainWebviewHeaderBackButton(),
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
            title: t('BCSC.TransferInformation.TransferAccount'),
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
          initialParams={pairingInitialParams}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainContactUs}
          component={ContactUsScreen}
          options={() => ({
            headerShown: true,
            title: t('BCSC.Screens.ContactUs'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.MainPrivacyPolicy}
          component={SettingsPrivacyPolicyScreen}
          options={() => ({
            headerShown: true,
            title: t('BCSC.Screens.PrivacyInformation'),
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
        <Stack.Screen
          name={BCSCScreens.MainDeveloper}
          component={Developer}
          options={() => ({
            title: t('Developer.DeveloperMode'),
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.AccountExpired}
          component={AccountExpiredScreen}
          options={() => ({
            animationEnabled: false,
            title: t('BCSC.Title'),
            headerShown: true,
            // This screen has its own banner inside the screen component
            header: createHeaderWithoutBanner,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.AccountRenewalInformation}
          component={AccountRenewalInformationScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.AccountRenewalFirstWarning}
          component={AccountRenewalFirstWarningScreen}
          options={() => ({
            headerShown: true,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.AccountRenewalFinalWarning}
          component={AccountRenewalFinalWarningScreen}
          options={() => ({
            headerShown: true,
          })}
        />

        {/* React navigation docs suggest modals at bottom of stack */}
        <Stack.Screen
          name={BCSCModals.InternetDisconnected}
          component={InternetDisconnected}
          options={{
            ...getDefaultModalOptions(t('BCSC.Title')),
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name={BCSCModals.MandatoryUpdate}
          component={MandatoryUpdate}
          options={{
            ...getDefaultModalOptions(t('BCSC.Title')),
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name={BCSCModals.DeviceInvalidated}
          component={DeviceInvalidated}
          options={{
            ...getDefaultModalOptions(t('BCSC.Title')),
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
