import { createHeaderWithBanner } from '@/bcsc-theme/components/HeaderWithBanner'
import { createVerifyHelpHeaderButton } from '@/bcsc-theme/components/HelpHeaderButton'
import { createVerifySettingsHeaderButton } from '@/bcsc-theme/components/SettingsHeaderButton'
import { createVerifyWebviewHeaderBackButton } from '@/bcsc-theme/components/WebViewBackButton'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { getDefaultModalOptions } from '@/bcsc-theme/navigators/stack-utils'
import { BCSCModals, BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Developer from '../../screens/Developer'
import AccountSetupSelectionScreen from '../features/account-transfer/AccountSetupSelectionScreen'
import TransferInformationScreen from '../features/account-transfer/TransferInformationScreen'
import TransferInstructionsScreen from '../features/account-transfer/TransferInstructionsScreen'
import TransferQRScannerScreen from '../features/account-transfer/TransferQRScannerScreen'
import NicknameAccountScreen from '../features/account/NicknameAccountScreen'
import EnterBirthdateScreen from '../features/verify/EnterBirthdateScreen'
import IdentitySelectionScreen from '../features/verify/IdentitySelectionScreen'
import ManualSerialScreen from '../features/verify/ManualSerialScreen'
import MismatchedSerialScreen from '../features/verify/MismatchedSerialScreen'
import NewSetupScreen from '../features/verify/NewSetupScreen'
import PhotoInstructionsScreen from '../features/verify/PhotoInstructionsScreen'
import PhotoReviewScreen from '../features/verify/PhotoReviewScreen'
import { ResidentialAddressScreen } from '../features/verify/ResidentialAddressScreen'
import ScanSerialScreen from '../features/verify/ScanSerialScreen'
import SerialInstructionsScreen from '../features/verify/SerialInstructionsScreen'
import SetupStepsScreen from '../features/verify/SetupStepsScreen'
import TakePhotoScreen from '../features/verify/TakePhotoScreen'
import VerificationMethodSelectionScreen from '../features/verify/VerificationMethodSelectionScreen'
import VerificationSuccessScreen from '../features/verify/VerificationSuccessScreen'
import EmailConfirmationScreen from '../features/verify/email/EmailConfirmationScreen'
import EnterEmailScreen from '../features/verify/email/EnterEmailScreen'
import VerifyInPersonScreen from '../features/verify/in-person/VerifyInPersonScreen'
import BeforeYouCallScreen from '../features/verify/live-call/BeforeYouCallScreen'
import CallBusyOrClosedScreen from '../features/verify/live-call/CallBusyOrClosedScreen'
import LiveCallScreen from '../features/verify/live-call/LiveCallScreen'
import StartCallScreen from '../features/verify/live-call/StartCallScreen'
import VerifyNotCompleteScreen from '../features/verify/live-call/VerifyNotComplete'
import AdditionalIdentificationRequiredScreen from '../features/verify/non-photo/AdditionalIdentificationRequiredScreen'
import DualIdentificationRequiredScreen from '../features/verify/non-photo/DualIdentificationRequiredScreen'
import EvidenceCaptureScreen from '../features/verify/non-photo/EvidenceCaptureScreen'
import EvidenceIDCollectionScreen from '../features/verify/non-photo/EvidenceIDCollectionScreen'
import EvidenceTypeListScreen from '../features/verify/non-photo/EvidenceTypeListScreen'
import IDPhotoInformationScreen from '../features/verify/non-photo/IDPhotoInformationScreen'
import InformationRequiredScreen from '../features/verify/send-video/InformationRequiredScreen'
import PendingReviewScreen from '../features/verify/send-video/PendingReviewScreen'
import SuccessfullySentScreen from '../features/verify/send-video/SuccessfullySentScreen'
import TakeVideoScreen from '../features/verify/send-video/TakeVideoScreen'
import VideoInstructionsScreen from '../features/verify/send-video/VideoInstructionsScreen'
import VideoReviewScreen from '../features/verify/send-video/VideoReviewScreen'
import VideoTooLongScreen from '../features/verify/send-video/VideoTooLongScreen'

import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { SettingsPrivacyPolicyScreen } from '../features/settings/SettingsPrivacyPolicyScreen'
import { VerifyContactUsScreen } from '../features/settings/VerifyContactUsScreen'
import { VerifyHelpCentreScreen } from '../features/settings/VerifyHelpCentreScreen'
import { VerifySettingsScreen } from '../features/settings/VerifySettingsScreen'
import { VerifyWebViewScreen } from '../features/webview/VerifyWebViewScreen'

const VerifyStack = () => {
  const Stack = createStackNavigator<BCSCVerifyStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const client = useBCSCApiClient()
  const defaultStackOptions = useDefaultStackOptions(theme)

  const handleManageDevices = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      url: `${client.baseURL}/account/embedded/devices`,
      title: t('Unified.Screens.ManageDevices'),
    })
  }, [client.baseURL, navigation, t])

  return (
    <Stack.Navigator
      initialRouteName={BCSCScreens.SetupTypes}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        title: '',
        headerShadowVisible: false,
        header: createHeaderWithBanner(handleManageDevices),
      }}
    >
      <Stack.Screen
        name={BCSCScreens.SetupTypes}
        component={AccountSetupSelectionScreen}
        options={{
          headerLeft: createVerifySettingsHeaderButton(),
          title: t('Unified.Screens.SetupTypes'),
        }}
      />
      <Stack.Screen name={BCSCScreens.NewSetup} component={NewSetupScreen} />
      <Stack.Screen
        name={BCSCScreens.SetupSteps}
        component={SetupStepsScreen}
        options={{
          title: t('Unified.Screens.SetupSteps'),
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOW_TO_SETUP }),
          headerLeft: createVerifySettingsHeaderButton(),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.NicknameAccount}
        component={NicknameAccountScreen}
        options={{
          headerShown: true,
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: createVerifyWebviewHeaderBackButton(),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.TransferAccountInformation}
        component={TransferInformationScreen}
        options={{ title: t('Unified.TransferInformation.TransferAccount') }}
      />
      <Stack.Screen name={BCSCScreens.TransferAccountInstructions} component={TransferInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TransferAccountQRScan} component={TransferQRScannerScreen} />
      <Stack.Screen name={BCSCScreens.IdentitySelection} component={IdentitySelectionScreen} />
      <Stack.Screen
        name={BCSCScreens.VerifyHelpCentre}
        component={VerifyHelpCentreScreen}
        options={{ title: t('Unified.Screens.HelpCentre') }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyPrivacyPolicy}
        component={SettingsPrivacyPolicyScreen}
        options={{ title: t('Unified.Screens.PrivacyInformation') }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyContactUs}
        component={VerifyContactUsScreen}
        options={{ title: t('Unified.Screens.ContactUs') }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyDeveloper}
        component={Developer}
        options={{ title: t('Developer.DeveloperMode') }}
      />
      <Stack.Screen
        name={BCSCScreens.SerialInstructions}
        component={SerialInstructionsScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.ManualSerial}
        component={ManualSerialScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.ScanSerial}
        component={ScanSerialScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen name={BCSCScreens.EnterBirthdate} component={EnterBirthdateScreen} />
      <Stack.Screen name={BCSCScreens.MismatchedSerial} component={MismatchedSerialScreen} />
      <Stack.Screen name={BCSCScreens.EnterEmail} component={EnterEmailScreen} />
      <Stack.Screen name={BCSCScreens.EmailConfirmation} component={EmailConfirmationScreen} />
      <Stack.Screen
        name={BCSCScreens.VerificationMethodSelection}
        component={VerificationMethodSelectionScreen}
        options={{
          title: t('Unified.Screens.VerificationMethodSelection'),
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.VERIFICATION_METHODS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyInPerson}
        component={VerifyInPersonScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.VERIFY_IN_PERSON }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.InformationRequired}
        component={InformationRequiredScreen}
        options={{ title: t('Unified.Screens.InformationRequired') }}
      />
      <Stack.Screen name={BCSCScreens.PhotoInstructions} component={PhotoInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TakePhoto} component={TakePhotoScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.PhotoReview} component={PhotoReviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.VideoInstructions} component={VideoInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TakeVideo} component={TakeVideoScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.VideoReview} component={VideoReviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name={BCSCScreens.PendingReview} component={PendingReviewScreen} />
      <Stack.Screen name={BCSCScreens.VideoTooLong} component={VideoTooLongScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.SuccessfullySent}
        component={SuccessfullySentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationSuccess}
        component={VerificationSuccessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={BCSCScreens.AdditionalIdentificationRequired}
        component={AdditionalIdentificationRequiredScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.ACCEPTED_IDENTITY_DOCUMENTS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.DualIdentificationRequired}
        component={DualIdentificationRequiredScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.ACCEPTED_IDENTITY_DOCUMENTS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.IDPhotoInformation}
        component={IDPhotoInformationScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceTypeList}
        component={EvidenceTypeListScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceCapture}
        component={EvidenceCaptureScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceIDCollection}
        component={EvidenceIDCollectionScreen}
        options={{
          headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyWebView}
        component={VerifyWebViewScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.title,
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: createVerifyWebviewHeaderBackButton(),
        })}
      />
      <Stack.Screen
        name={BCSCScreens.BeforeYouCall}
        component={BeforeYouCallScreen}
        options={{ headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen
        name={BCSCScreens.StartCall}
        component={StartCallScreen}
        options={{ headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen name={BCSCScreens.LiveCall} component={LiveCallScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.VerifyNotComplete}
        component={VerifyNotCompleteScreen}
        options={{ headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen
        name={BCSCScreens.CallBusyOrClosed}
        component={CallBusyOrClosedScreen}
        options={{ headerRight: createVerifyHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen name={BCSCScreens.ResidentialAddress} component={ResidentialAddressScreen} />
      <Stack.Screen
        name={BCSCScreens.VerifySettings}
        component={VerifySettingsScreen}
        options={{
          headerShown: true,
          title: t('Screens.Settings'),
          headerBackTestID: testIdWithKey('Back'),
          headerShadowVisible: false,
        }}
      />

      {/* React navigation docs suggest modals at bottom of stack */}
      <Stack.Screen
        name={BCSCModals.InternetDisconnected}
        component={MandatoryUpdate}
        options={{
          ...getDefaultModalOptions(t('Unified.BCSC')),
          gestureEnabled: false, // Disable swipe to dismiss
        }}
      />

      <Stack.Screen
        name={BCSCModals.MandatoryUpdate}
        component={MandatoryUpdate}
        options={{
          ...getDefaultModalOptions(t('Unified.BCSC')),
          gestureEnabled: false, // Disable swipe to dismiss
        }}
      />
    </Stack.Navigator>
  )
}

export default VerifyStack
