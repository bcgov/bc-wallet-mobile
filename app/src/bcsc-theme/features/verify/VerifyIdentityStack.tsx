import createHelpHeaderButton from '@/bcsc-theme/components/HelpHeaderButton'
import { createSettingsHeaderButton } from '@/bcsc-theme/components/SettingsHeaderButton'
import { createWebviewHeaderBackButton } from '@/bcsc-theme/components/WebViewBackButton'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import AccountSetupSelectionScreen from '../account-transfer/AccountSetupSelectionScreen'
import TransferInformationScreen from '../account-transfer/TransferInformationScreen'
import TransferInstructionsScreen from '../account-transfer/TransferInstructionsScreen'
import TransferQRScannerScreen from '../account-transfer/TransferQRScannerScreen'
import TransferSuccessScreen from '../account-transfer/TransferSuccessScreen'
import NicknameAccountScreen from '../account/NicknameAccountScreen'
import Settings from '../settings/Settings'
import WebViewScreen from '../webview/WebViewScreen'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import ManualSerialScreen from './ManualSerialScreen'
import MismatchedSerialScreen from './MismatchedSerialScreen'
import NewSetupScreen from './NewSetupScreen'
import PhotoInstructionsScreen from './PhotoInstructionsScreen'
import PhotoReviewScreen from './PhotoReviewScreen'
import { ResidentialAddressScreen } from './ResidentialAddressScreen'
import ScanSerialScreen from './ScanSerialScreen'
import SerialInstructionsScreen from './SerialInstructionsScreen'
import SetupStepsScreen from './SetupStepsScreen'
import TakePhotoScreen from './TakePhotoScreen'
import VerificationMethodSelectionScreen from './VerificationMethodSelectionScreen'
import VerificationSuccessScreen from './VerificationSuccessScreen'
import EmailConfirmationScreen from './email/EmailConfirmationScreen'
import EnterEmailScreen from './email/EnterEmailScreen'
import VerifyInPersonScreen from './in-person/VerifyInPersonScreen'
import BeforeYouCallScreen from './live-call/BeforeYouCallScreen'
import CallBusyOrClosedScreen from './live-call/CallBusyOrClosedScreen'
import LiveCallScreen from './live-call/LiveCallScreen'
import StartCallScreen from './live-call/StartCallScreen'
import VerifyNotCompleteScreen from './live-call/VerifyNotComplete'
import AdditionalIdentificationRequiredScreen from './non-photo/AdditionalIdentificationRequiredScreen'
import DualIdentificationRequiredScreen from './non-photo/DualIdentificationRequiredScreen'
import EvidenceCaptureScreen from './non-photo/EvidenceCaptureScreen'
import EvidenceIDCollectionScreen from './non-photo/EvidenceIDCollectionScreen'
import EvidenceTypeListScreen from './non-photo/EvidenceTypeListScreen'
import IDPhotoInformationScreen from './non-photo/IDPhotoInformationScreen'
import InformationRequiredScreen from './send-video/InformationRequiredScreen'
import PendingReviewScreen from './send-video/PendingReviewScreen'
import SuccessfullySentScreen from './send-video/SuccessfullySentScreen'
import TakeVideoScreen from './send-video/TakeVideoScreen'
import VideoInstructionsScreen from './send-video/VideoInstructionsScreen'
import VideoReviewScreen from './send-video/VideoReviewScreen'
import VideoTooLongScreen from './send-video/VideoTooLongScreen'
import HeaderWithBanner from '@/bcsc-theme/components/HeaderWithBanner'

const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        title: '',
        header: HeaderWithBanner,
      }}
    >
      <Stack.Screen
        name={BCSCScreens.SetupTypes}
        component={AccountSetupSelectionScreen}
        options={{
          headerLeft: createSettingsHeaderButton(),
          title: t('Unified.Screens.SetupTypes'),
        }}
      />
      <Stack.Screen name={BCSCScreens.NewSetup} component={NewSetupScreen} />
      <Stack.Screen
        name={BCSCScreens.SetupSteps}
        component={SetupStepsScreen}
        options={{
          title: t('Unified.Screens.SetupSteps'),
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOW_TO_SETUP }),
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.NicknameAccount}
        component={NicknameAccountScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: createWebviewHeaderBackButton(navigation),
        })}
      />
      <Stack.Screen name={BCSCScreens.TransferAccountInformation} component={TransferInformationScreen} />
      <Stack.Screen name={BCSCScreens.TransferAccountSuccess} component={TransferSuccessScreen} />
      <Stack.Screen name={BCSCScreens.TransferAccountInstructions} component={TransferInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.TransferAccountQRScan} component={TransferQRScannerScreen} />
      <Stack.Screen name={BCSCScreens.IdentitySelection} component={IdentitySelectionScreen} />
      <Stack.Screen
        name={BCSCScreens.SerialInstructions}
        component={SerialInstructionsScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.ManualSerial}
        component={ManualSerialScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.ScanSerial}
        component={ScanSerialScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
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
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.VERIFICATION_METHODS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyInPerson}
        component={VerifyInPersonScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.VERIFY_IN_PERSON }),
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
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.ACCEPTED_IDENTITY_DOCUMENTS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.DualIdentificationRequired}
        component={DualIdentificationRequiredScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.ACCEPTED_IDENTITY_DOCUMENTS }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.IDPhotoInformation}
        component={IDPhotoInformationScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceTypeList}
        component={EvidenceTypeListScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceCapture}
        component={EvidenceCaptureScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceIDCollection}
        component={EvidenceIDCollectionScreen}
        options={{
          headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
        }}
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
        name={BCSCScreens.BeforeYouCall}
        component={BeforeYouCallScreen}
        options={{ headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen
        name={BCSCScreens.StartCall}
        component={StartCallScreen}
        options={{ headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen name={BCSCScreens.LiveCall} component={LiveCallScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.VerifyNotComplete}
        component={VerifyNotCompleteScreen}
        options={{ headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen
        name={BCSCScreens.CallBusyOrClosed}
        component={CallBusyOrClosedScreen}
        options={{ headerRight: createHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }) }}
      />
      <Stack.Screen name={BCSCScreens.ResidentialAddress} component={ResidentialAddressScreen} />

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
    </Stack.Navigator>
  )
}

export default VerifyIdentityStack
