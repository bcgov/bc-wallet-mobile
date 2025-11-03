import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { createHeaderWithBanner } from '../components/HeaderWithBanner'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { createWebviewHeaderBackButton } from '../components/WebViewBackButton'
import TransferQRDisplayScreen from '../features/account-transfer/TransferQRDisplayScreen'
import TransferQRInformationScreen from '../features/account-transfer/TransferQRInformationScreen'
import TransferSuccessScreen from '../features/account-transfer/TransferSuccessScreen'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import RemoveAccountConfirmationScreen from '../features/account/RemoveAccountConfirmationScreen'
import { PrivacyPolicyScreen } from '../features/onboarding/PrivacyPolicyScreen'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { ForgetAllPairingsScreen } from '../features/settings/ForgetAllPairingsScreen'
import { HelpCentreScreen } from '../features/settings/HelpCentreScreen'
import Settings from '../features/settings/Settings'
import WebViewScreen from '../features/webview/WebViewScreen'
import { BCSCModals, BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import Developer from '../../screens/Developer'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { getDefaultModalOptions } from './stack-utils'

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const theme = useTheme()
  const { t } = useTranslation()
  const Stack = createStackNavigator<BCSCRootStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)
  useSystemChecks(SystemCheckScope.MAIN_STACK)

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator
        initialRouteName={BCSCStacks.TabStack}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerBackTestID: testIdWithKey('Back'),
          headerShadowVisible: false,
          header: createHeaderWithBanner,
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
          name={BCSCScreens.ContactUs}
          component={ContactUsScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.Screens.ContactUs'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.HelpCentre}
          component={HelpCentreScreen}
          options={() => ({
            headerShown: true,
            title: t('Unified.Screens.HelpCentre'),
            headerBackTestID: testIdWithKey('Back'),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.PrivacyPolicy}
          component={PrivacyPolicyScreen}
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
        <Stack.Screen
          name={BCSCScreens.Developer}
          component={Developer}
          options={() => ({
            title: t('Developer.DeveloperMode'),
            headerShown: true,
          })}
        />
        {/* React navigation docs suggest modals at bottom of stack */}
        <Stack.Screen
          name={BCSCModals.InternetDisconnected}
          component={InternetDisconnected}
          options={{
            ...getDefaultModalOptions(t('Unified.BCSC')),
            gestureEnabled: false, // Disable swipe to dismiss
          }}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
