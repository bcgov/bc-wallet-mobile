import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE, HelpCentreUrl } from '@/constants'
import { BCState } from '@/store'
import {
  CredentialDetails,
  Screens,
  testIdWithKey,
  TOKENS,
  useDefaultStackOptions,
  useServices,
  useStore,
  useTheme,
  useTour,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Developer from '../../screens/Developer'
import { createFloatingHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createHeaderWithBanner, createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createMainHelpHeaderButton } from '../components/HelpHeaderButton'
import { useBCSCStack } from '../contexts/BCSCStackContext'
import TransferQRDisplayScreen from '../features/account-transfer/transferer/TransferQRDisplayScreen'
import TransferQRInformationScreen from '../features/account-transfer/transferer/TransferQRInformationScreen'
import TransferSuccessScreen from '../features/account-transfer/transferer/TransferSuccessScreen'
import AccountDetailsScreen from '../features/account/AccountDetailsScreen'
import { AccountExpiredScreen } from '../features/account/AccountExpiredScreen'
import { AccountRenewalFinalWarningScreen } from '../features/account/AccountRenewalFinalWarningScreen'
import { AccountRenewalFirstWarningScreen } from '../features/account/AccountRenewalFirstWarningScreen'
import { AccountRenewalInformationScreen } from '../features/account/AccountRenewalInformationScreen'
import EditNicknameScreen from '../features/account/EditNicknameScreen'
import { MainRemoveAccountConfirmationScreen } from '../features/account/RemoveAccountConfirmationScreen'
import { ReverifyAccountScreen } from '../features/account/ReverifyAccountScreen'
import TransferAgeRestrictionScreen from '../features/account/TransferAgeRestrictionScreen'
import { AgentReadyGate, BifoldScope, withAgentReadyGate } from '../features/agent'
import { MainChangePINScreen } from '../features/auth/MainChangePINScreen'
import { MainChangeSecurityScreen } from '../features/auth/MainChangeSecurityScreen'
import { useConnectionInvitationDeepLink } from '../features/connection-invitation'
import ContactChatScreen from '../features/contacts/ContactChatScreen'
import ContactDetailsScreen from '../features/contacts/ContactDetailsScreen'
import ContactJSONDetailsScreen from '../features/contacts/ContactJSONDetailsScreen'
import ContactsScreen from '../features/contacts/ContactsScreen'
import EditContactNameScreen from '../features/contacts/EditContactNameScreen'
import RemoveContactScreen from '../features/contacts/RemoveContactScreen'
import WhatAreContactsScreen from '../features/contacts/WhatAreContactsScreen'
import { DeviceInvalidated } from '../features/modal/DeviceInvalidated'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { ServiceOutage } from '../features/modal/ServiceOutage'
import { TermsOfUseUpdated } from '../features/modal/TermsOfUseUpdated'
import { usePairingService } from '../features/pairing'
import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import ConnectionLoadingScreen from '../features/qr-core/ConnectionLoadingScreen'
import { ServiceLoginScreen } from '../features/services/ServiceLoginScreen'
import { AutoLockScreen } from '../features/settings/AutoLockScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { ForgetAllPairingsScreen } from '../features/settings/ForgetAllPairingsScreen'
import { MainPrivacyPolicyScreen } from '../features/settings/MainPrivacyPolicyScreen'
import { MainSettingsScreen } from '../features/settings/MainSettingsScreen'
import { MainResetWalletConfirmationScreen } from '../features/settings/ResetWalletConfirmationScreen'
import { WebViewScreen } from '../features/webview/WebViewScreen'
import { useBCSCApiClient } from '../hooks/useBCSCApiClient'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { BCSCMainStackParams, BCSCModals, BCSCScreens, BCSCStacks } from '../types/navigators'
import QRCoreStack from './QRCoreStack'
import { getDefaultModalOptions } from './stack-utils'
import BCSCTabStack from './TabStack'

const ScopedCredentialDetails: React.FC<React.ComponentProps<typeof CredentialDetails>> = (props) => (
  <AgentReadyGate testID={testIdWithKey('CredentialDetails.Loading')}>
    <CredentialDetails {...props} />
  </AgentReadyGate>
)

// Contact screens call Bifold connection hooks (useConnections / useConnectionById)
// that require the providers BifoldScope only mounts once the agent is ready.
// Gate them so an early mount — a cold-start quick-tap into Settings → Contacts,
// or navigation state restoring onto a deep contact screen — shows the loading/
// retry state instead of crashing on a missing ConnectionProvider.
const ScopedContacts = withAgentReadyGate(ContactsScreen, testIdWithKey('Contacts.Loading'))
const ScopedContactDetails = withAgentReadyGate(ContactDetailsScreen, testIdWithKey('ContactDetails.Loading'))
const ScopedEditContactName = withAgentReadyGate(EditContactNameScreen, testIdWithKey('EditContactName.Loading'))
const ScopedRemoveContact = withAgentReadyGate(RemoveContactScreen, testIdWithKey('RemoveContact.Loading'))

const MainStack: React.FC = () => {
  const { currentStep } = useTour()
  const theme = useTheme()
  const { t } = useTranslation()
  const Stack = createStackNavigator<BCSCMainStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)
  const pairingService = usePairingService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
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
        }`
      )
      return undefined
    }

    return {
      serviceTitle,
      pairingCode,
    }
  }, [logger, pendingPairing])

  const apiClient = useBCSCApiClient()

  const handleManageDevices = useCallback(() => {
    navigation.navigate(BCSCScreens.MainWebView, {
      url: apiClient.endpoints.accountDevices,
      title: t('BCSC.Screens.ManageDevices'),
    })
  }, [apiClient.endpoints.accountDevices, navigation, t])

  const headerWithBanner = useMemo(
    () => createHeaderWithBanner(handleManageDevices, store.bcsc.bannerMessages),
    [handleManageDevices, store.bcsc.bannerMessages]
  )

  const initialRouteName = pairingInitialParams ? BCSCScreens.ServiceLogin : BCSCStacks.Tab

  useSystemChecks(SystemCheckScope.MAIN_STACK)
  useBCSCStack(BCSCStacks.Main)

  // Accept connection-invitation deep links (e.g. from the showcase) once the
  // agent is ready and route to the Connection screen (#2288).
  useConnectionInvitationDeepLink()

  useEffect(() => {
    const unsubscribe = pairingService.onNavigationRequest(({ screen, params }) => {
      if (screen === BCSCScreens.ServiceLogin) {
        navigation.navigate(BCSCScreens.ServiceLogin, params as BCSCMainStackParams[BCSCScreens.ServiceLogin])
      }
    })

    return unsubscribe
  }, [pairingService, navigation])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <BifoldScope>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            ...defaultStackOptions,
            headerShown: false,
            title: '',
            headerBackTestID: testIdWithKey('Back'),
            headerShadowVisible: false,
            headerBackTitleVisible: false,
            headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
            headerLeft: createHeaderBackButton,
            header: headerWithBanner,
            headerRight: createFloatingHelpMenuButton({ webViewScreen: BCSCScreens.MainWebView }),
          }}
        >
          <Stack.Screen
            name={BCSCScreens.Contacts}
            component={ScopedContacts}
            options={() => ({
              headerShown: true,
              title: t('BCSC.Contacts.Title'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.WhatAreContacts}
            component={WhatAreContactsScreen}
            options={() => ({
              headerShown: true,
              title: t('BCSC.Contacts.Title'),
              headerRight: () => null,
            })}
          />
          <Stack.Screen
            name={BCSCScreens.ContactDetails}
            component={ScopedContactDetails}
            options={() => ({
              headerShown: true,
              title: t('BCSC.Contacts.Details.Title'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.EditContactName}
            component={ScopedEditContactName}
            options={() => ({
              headerShown: true,
              title: t('BCSC.Contacts.EditName.HeaderTitle'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.ContactJSONDetails}
            component={ContactJSONDetailsScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.title ?? t('BCSC.Contacts.JSON.Title'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.ContactChat}
            component={ContactChatScreen}
            options={() => ({
              headerShown: true,
              title: '',
            })}
          />
          <Stack.Screen
            name={BCSCScreens.RemoveContact}
            component={ScopedRemoveContact}
            options={() => ({
              ...getDefaultModalOptions(t('BCSC.Contacts.Remove.HeaderTitle')),
            })}
          />
          <Stack.Screen
            name={BCSCStacks.Tab}
            component={BCSCTabStack}
            options={{
              animationEnabled: false,
            }}
          />
          <Stack.Screen
            name={BCSCScreens.QRCore}
            component={QRCoreStack}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name={BCSCScreens.ConnectionLoading}
            component={ConnectionLoadingScreen}
            options={({ route }) => {
              // Offers / proof requests opened from a home notification land directly on
              // the offer / request view, so keep the default back button — backing out
              // leaves the notification pending (in its read state) instead of forcing
              // an accept / decline. QR-scan entries (oobRecordId) run the connection
              // handshake, where backing out mid-exchange isn't supported — the loading
              // placeholder has its own cancel affordance.
              const { credentialId, proofId } = route.params
              if (credentialId || proofId) {
                return {
                  headerShown: true,
                  title: credentialId ? t('Screens.CredentialOffer') : t('Screens.ProofRequest'),
                }
              }

              return {
                headerShown: true,
                headerLeft: () => null,
                gestureEnabled: false,
                title: t('BCSC.Scan.Connecting'),
              }
            }}
          />
          <Stack.Screen
            name={Screens.CredentialDetails}
            component={ScopedCredentialDetails}
            options={{
              headerShown: true,
              title: t('Screens.CredentialDetails'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.EditNickname}
            component={EditNicknameScreen}
            options={{
              headerShown: true,
              title: t('BCSC.Screens.Nickname'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.AccountDetails}
            component={AccountDetailsScreen}
            options={{
              headerShown: true,
              title: t('BCSC.Screens.AccountDetails'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.MainSettings}
            component={MainSettingsScreen}
            options={{
              headerShown: true,
              title: t('BCSC.Screens.Settings'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.MainAutoLock}
            component={AutoLockScreen}
            options={{
              headerShown: true,
              title: t('BCSC.Settings.AutoLockTime'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.MainAppSecurity}
            component={MainChangeSecurityScreen}
            options={{
              headerShown: true,
              title: t('BCSC.Settings.AppSecurity.ScreenTitle'),
            }}
          />
          <Stack.Screen
            name={BCSCScreens.MainChangePIN}
            component={MainChangePINScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.isChangingExistingPIN
                ? t('BCSC.ChangePIN.ScreenTitle')
                : t('BCSC.Settings.ChangePIN.ScreenTitle'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.ManualPairingCode}
            component={ManualPairingCode}
            options={() => ({
              headerShown: true,
              headerRight: createMainHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.COMPUTER_LOGIN }),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.MainWebView}
            component={WebViewScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params.title,
            })}
          />
          <Stack.Screen name={BCSCScreens.PairingConfirmation} component={PairingConfirmation} />
          <Stack.Screen
            name={BCSCScreens.MainRemoveAccountConfirmation}
            component={MainRemoveAccountConfirmationScreen}
            options={() => ({
              headerShown: true,
            })}
          />
          <Stack.Screen
            name={BCSCScreens.MainResetWalletConfirmation}
            component={MainResetWalletConfirmationScreen}
            options={() => ({
              headerShown: true,
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
            name={BCSCScreens.TransferAgeRestriction}
            component={TransferAgeRestrictionScreen}
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
            })}
          />
          <Stack.Screen
            name={BCSCScreens.MainPrivacyPolicy}
            component={MainPrivacyPolicyScreen}
            options={() => ({
              headerShown: true,
              title: t('BCSC.Screens.PrivacyInformation'),
            })}
          />
          <Stack.Screen
            name={BCSCScreens.ForgetAllPairings}
            component={ForgetAllPairingsScreen}
            options={() => ({
              headerShown: true,
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
              headerLeft: () => null,
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
          <Stack.Screen
            name={BCSCScreens.ReverifyAccount}
            component={ReverifyAccountScreen}
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

          <Stack.Screen
            name={BCSCModals.ServiceOutage}
            component={ServiceOutage}
            options={{
              ...getDefaultModalOptions(t('BCSC.Title')),
              gestureEnabled: false,
            }}
          />

          <Stack.Screen
            name={BCSCModals.TermsOfUseUpdated}
            component={TermsOfUseUpdated}
            options={{
              ...getDefaultModalOptions(t('BCSC.Title')),
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </BifoldScope>
    </View>
  )
}

export default MainStack
