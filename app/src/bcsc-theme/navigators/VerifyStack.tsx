import { createHeaderWithoutBanner } from '@/bcsc-theme/components/HeaderWithBanner'
import { createProgressHeader } from '@/bcsc-theme/components/VerifyProgressHeader'
import { useVerificationResponseListener } from '@/bcsc-theme/features/verification-response/useVerificationResponseListener'
import { getDefaultModalOptions } from '@/bcsc-theme/navigators/stack-utils'
import { BCSCModals, BCSCScreens, BCSCStacks, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE, HelpCentreUrl } from '@/constants'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { testIdWithKey, TOKENS, useDefaultStackOptions, useServices, useStore, useTheme } from '@bifold/core'
import { HeaderBackButtonProps } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Developer from '../../screens/Developer'
import { createFloatingHelpMenuButton, createVerifyHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createHeaderBackButton, HeaderBackButton } from '../components/HeaderBackButton'
import { createVerifySettingsHeaderButton } from '../components/SettingsHeaderButton'
import { useBCSCStack } from '../contexts/BCSCStackContext'
import TransferInstructionsScreen from '../features/account-transfer/transferee/TransferInstructionsScreen'
import TransferQRScannerScreen from '../features/account-transfer/transferee/TransferQRScannerScreen'
import { VerifyRemoveAccountConfirmationScreen } from '../features/account/RemoveAccountConfirmationScreen'
import SessionRecoveryScreen from '../features/auth/SessionRecoveryScreen'
import { VerifyChangePINScreen } from '../features/auth/VerifyChangePINScreen'
import { VerifyChangeSecurityScreen } from '../features/auth/VerifyChangeSecurityScreen'
import { InternetDisconnected } from '../features/modal/InternetDisconnected'
import { MandatoryUpdate } from '../features/modal/MandatoryUpdate'
import { ServiceOutage } from '../features/modal/ServiceOutage'
import { VerificationSessionExpired } from '../features/modal/VerificationSessionExpired'
import AccountSetupScreen from '../features/onboarding/AccountSetupScreen'
import { VerifyPromptScreen } from '../features/onboarding/VerifyPromptScreen'
import { AutoLockScreen } from '../features/settings/AutoLockScreen'
import { ContactUsScreen } from '../features/settings/ContactUsScreen'
import { NotificationSettingsScreen } from '../features/settings/NotificationSettingsScreen'
import { VerifyPrivacyPolicyScreen } from '../features/settings/VerifyPrivacyPolicyScreen'
import { VerifySettingsScreen } from '../features/settings/VerifySettingsScreen'
import BirthdateLockoutScreen from '../features/verify/BirthdateLockoutScreen'
import EnterBirthdateScreen from '../features/verify/EnterBirthdate/EnterBirthdateScreen'
import IdentitySelectionScreen from '../features/verify/IdentitySelectionScreen'
import ManualSerialScreen from '../features/verify/ManualSerialScreen'
import PhotoInstructionsScreen from '../features/verify/PhotoInstructionsScreen'
import PhotoReviewScreen from '../features/verify/PhotoReviewScreen'
import { ResidentialAddressScreen } from '../features/verify/ResidentialAddressScreen'
import ScanSerialScreen from '../features/verify/ScanSerialScreen'
import SerialInstructionsScreen from '../features/verify/SerialInstructionsScreen'
import TakePhotoScreen from '../features/verify/TakePhotoScreen'
import VerificationCardErrorScreen from '../features/verify/VerificationCardErrorScreen'
import VerificationMethodSelectionScreen from '../features/verify/VerificationMethodSelectionScreen'
import VerificationSuccessScreen from '../features/verify/VerificationSuccessScreen'
import EmailConfirmationScreen from '../features/verify/email/EmailConfirmationScreen'
import EmailVerifiedScreen from '../features/verify/email/EmailVerifiedScreen'
import EnterEmailScreen from '../features/verify/email/EnterEmailScreen'
import VerifyInPersonScreen from '../features/verify/in-person/VerifyInPersonScreen'
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
import CancelledReview from '../features/verify/send-video/CancelledReview'
import PendingReviewScreen from '../features/verify/send-video/PendingReviewScreen'
import SuccessfullySentScreen from '../features/verify/send-video/SuccessfullySentScreen'
import TakeVideoScreen from '../features/verify/send-video/TakeVideoScreen'
import UploadingScreen from '../features/verify/send-video/UploadingScreen'
import VideoInstructionsScreen from '../features/verify/send-video/VideoInstructionsScreen'
import VideoReviewScreen from '../features/verify/send-video/VideoReviewScreen'
import VideoTooLongScreen from '../features/verify/send-video/VideoTooLongScreen'
import { WebViewScreen } from '../features/webview/WebViewScreen'
import useDataLoader from '../hooks/useDataLoader'
import { useLeaveVerification } from '../hooks/useLeaveVerification'
import { SystemCheckScope, useSystemChecks } from '../hooks/useSystemChecks'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { getResumeStepRoute } from '../utils/resume-step-route'

/**
 * Back button for a verify-stack screen that can be the stack's initial route when the user resumes
 * verification (see {@link getResumeStepRoute}). Such a screen is reached two ways:
 *  - Pushed on top of an earlier screen — a normal pop returns to it.
 *  - As the stack's initial route on resume — nothing sits beneath it, so there is no destination to
 *    pop to; instead leave the verification flow and return home, preserving progress (see
 *    {@link useLeaveVerification}).
 */
const VerifyResumeHeaderBackButton = (props: HeaderBackButtonProps) => {
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const leaveVerification = useLeaveVerification()

  return (
    <HeaderBackButton {...props} onPress={() => (navigation.canGoBack() ? navigation.goBack() : leaveVerification())} />
  )
}

// When PendingReview is the initial route (entered from the home screen notification),
// there is no navigation history — dispatch UNVERIFIED to swap back to MainStack instead.
const PendingReviewBackButton = (props: HeaderBackButtonProps) => {
  const [, dispatch] = useStore<BCState>()
  const handlePress = () => {
    dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS, payload: [VerificationStatus.UNVERIFIED] })
  }

  return <HeaderBackButton {...props} onPress={handlePress} />
}

interface VerifyStackProps {
  /**
   * Opens the stack on the one-time verify prompt rather than the user's resume step. Set by
   * RootStack for the single mount of the prompt that follows onboarding
   */
  showVerifyPrompt?: boolean
  onVerifyPromptAnswered?: () => void
}

const VerifyStack = ({ showVerifyPrompt = false, onVerifyPromptAnswered }: VerifyStackProps) => {
  const Stack = createStackNavigator<BCSCVerifyStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registrationService = useRegistrationService()
  const resumeRoute = getResumeStepRoute(store)
  // Opening on the prompt (rather than swapping stacks to reach it) lets prompt → setup question
  // animate as an in-stack slide. Everyone else resumes at the step they left off on.
  const initialRouteName = showVerifyPrompt ? BCSCScreens.VerifyPrompt : resumeRoute.name
  useBCSCStack(BCSCStacks.Verify)

  // Listen for verification status push notifications and add appropriate notification card
  useVerificationResponseListener()

  // Detect an expired in-progress verification session (device_code) and route to the restart screen.
  useSystemChecks(SystemCheckScope.VERIFY)

  // Ensure the user is registered with the BCSC backend
  const { load: loadRegistration } = useDataLoader(registrationService.ensureRegistered, {
    onError: (error) => {
      logger.error('[VerifyStack] Failed to ensure registration', error as Error)
    },
  })

  useEffect(() => {
    if (store.bcscSecure.sessionRecoveryRequired) {
      logger.info('[VerifyStack] Session recovery required, skipping registration load')
      return
    }

    loadRegistration()
  }, [loadRegistration, logger, store.bcscSecure.sessionRecoveryRequired])

  return (
    <Stack.Navigator
      // Users resume their verification journey directly at the step they are on.
      initialRouteName={initialRouteName}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        title: '',
        headerShadowVisible: false,
        headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
        headerLeft: createHeaderBackButton,
        headerBackTestID: testIdWithKey('Back'),
        headerBackTitleVisible: false,
        header: createHeaderWithoutBanner,
        headerRight: createVerifyHelpMenuButton({ showRestartVerification: true }),
      }}
    >
      <Stack.Screen
        name={BCSCScreens.VerifyPrompt}
        options={{
          // First screen of the verify journey — no back destination; help menu without "restart"
          // since verification hasn't started yet.
          headerLeft: () => null,
          headerRight: createVerifyHelpMenuButton(),
        }}
      >
        {({ navigation }) => (
          <VerifyPromptScreen
            onAnswered={onVerifyPromptAnswered}
            // replace (not navigate) so this one-time prompt is dropped from the stack. Once
            // "Continue" sets verification IN_PROGRESS, VerifyStack stays mounted, so returning to the
            // prompt would leave "Skip" a no-op (it can no longer unmount the stack). With the prompt
            // gone, AccountSetup's back button leaves verification (home) instead of re-showing it.
            onContinue={() => navigation.replace(BCSCScreens.AccountSetup)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name={BCSCScreens.AccountSetup}
        component={AccountSetupScreen}
        options={{
          headerLeft: VerifyResumeHeaderBackButton,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.IdentitySelection}
        component={IdentitySelectionScreen}
        options={{
          headerLeft: VerifyResumeHeaderBackButton,
          header: createProgressHeader(1, 10),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.SessionRecovery}
        component={SessionRecoveryScreen}
        options={{ headerLeft: () => null, gestureEnabled: false }}
      />
      <Stack.Screen name={BCSCScreens.VerifyPrivacyPolicy} component={VerifyPrivacyPolicyScreen} />
      <Stack.Screen name={BCSCScreens.VerifyContactUs} component={ContactUsScreen} />
      <Stack.Screen name={BCSCScreens.VerifyDeveloper} component={Developer} />
      <Stack.Screen
        name={BCSCScreens.SerialInstructions}
        component={SerialInstructionsScreen}
        options={{ header: createProgressHeader(1, 20) }}
      />
      <Stack.Screen
        name={BCSCScreens.ManualSerial}
        component={ManualSerialScreen}
        options={{ header: createProgressHeader(1, 40) }}
      />
      <Stack.Screen
        name={BCSCScreens.ScanSerial}
        component={ScanSerialScreen}
        options={{ header: createProgressHeader(1, 40) }}
      />
      <Stack.Screen
        name={BCSCScreens.EnterBirthdate}
        component={EnterBirthdateScreen}
        options={{
          header: createProgressHeader(1, 60),
          // Can be the stack's initial route when the user resumes after entering a serial (see
          // getResumeStepRoute); with nothing beneath it, back leaves the flow home rather than
          // being a dead button.
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationCardError}
        component={VerificationCardErrorScreen}
        options={{ header: createProgressHeader(1, 40) }}
      />
      <Stack.Screen
        name={BCSCScreens.BirthdateLockout}
        component={BirthdateLockoutScreen}
        options={{ header: createProgressHeader(1, 60) }}
      />
      <Stack.Screen
        name={BCSCScreens.EnterEmail}
        component={EnterEmailScreen}
        initialParams={
          resumeRoute.name === BCSCScreens.EnterEmail
            ? (resumeRoute.params as BCSCVerifyStackParams[typeof BCSCScreens.EnterEmail])
            : undefined
        }
        options={{
          header: createProgressHeader(4, 30),
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EmailConfirmation}
        component={EmailConfirmationScreen}
        options={{ header: createProgressHeader(4, 80) }}
      />
      <Stack.Screen
        name={BCSCScreens.EmailVerified}
        component={EmailVerifiedScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationMethodSelection}
        component={VerificationMethodSelectionScreen}
        options={{
          header: createProgressHeader(5, 20),
          headerLeft: createVerifySettingsHeaderButton(),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyInPerson}
        component={VerifyInPersonScreen}
        options={{ header: createProgressHeader(5, 70) }}
      />
      <Stack.Screen
        name={BCSCScreens.PhotoInstructions}
        component={PhotoInstructionsScreen}
        options={{ header: createProgressHeader(5, 30) }}
      />
      <Stack.Screen name={BCSCScreens.TakePhoto} component={TakePhotoScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.PhotoReview}
        component={PhotoReviewScreen}
        options={{ header: createProgressHeader(5, 30) }}
      />
      <Stack.Screen
        name={BCSCScreens.VideoInstructions}
        component={VideoInstructionsScreen}
        options={{ header: createProgressHeader(5, 50) }}
      />
      <Stack.Screen name={BCSCScreens.TakeVideo} component={TakeVideoScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.VideoReview}
        component={VideoReviewScreen}
        options={{ header: createProgressHeader(5, 50) }}
      />
      <Stack.Screen
        name={BCSCScreens.PendingReview}
        component={PendingReviewScreen}
        options={{
          header: createProgressHeader(5, 80),
          headerLeft: PendingReviewBackButton,
          title: t('BCSC.Steps.Status'),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.CancelledReview}
        component={CancelledReview}
        options={{ header: createProgressHeader(5, 80) }}
      />
      <Stack.Screen name={BCSCScreens.VideoTooLong} component={VideoTooLongScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.EvidenceUploading}
        component={UploadingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={BCSCScreens.SuccessfullySent}
        component={SuccessfullySentScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationSuccess}
        component={VerificationSuccessScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name={BCSCScreens.AdditionalIdentificationRequired}
        component={AdditionalIdentificationRequiredScreen}
        options={{
          header: createProgressHeader(2, 30),
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.DualIdentificationRequired}
        component={DualIdentificationRequiredScreen}
        options={{ header: createProgressHeader(2, 30) }}
      />
      <Stack.Screen
        name={BCSCScreens.IDPhotoInformation}
        component={IDPhotoInformationScreen}
        initialParams={
          resumeRoute.name === BCSCScreens.IDPhotoInformation
            ? (resumeRoute.params as BCSCVerifyStackParams[typeof BCSCScreens.IDPhotoInformation])
            : undefined
        }
        options={{
          header: createProgressHeader(2, 50),
          // Can be the stack's initial route when the user resumes after leaving mid-capture (see
          // getResumeStepRoute); with nothing beneath it, back leaves the flow home rather than
          // being a dead button.
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceTypeList}
        component={EvidenceTypeListScreen}
        initialParams={
          resumeRoute.name === BCSCScreens.EvidenceTypeList
            ? (resumeRoute.params as BCSCVerifyStackParams[typeof BCSCScreens.EvidenceTypeList])
            : undefined
        }
        options={{
          header: createProgressHeader(2, 60),
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceCapture}
        component={EvidenceCaptureScreen}
        options={{ header: createProgressHeader(2, 60) }}
      />
      <Stack.Screen
        name={BCSCScreens.EvidenceIDCollection}
        component={EvidenceIDCollectionScreen}
        initialParams={
          resumeRoute.name === BCSCScreens.EvidenceIDCollection
            ? (resumeRoute.params as BCSCVerifyStackParams[typeof BCSCScreens.EvidenceIDCollection])
            : undefined
        }
        options={{
          header: createProgressHeader(2, 75),
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen name={BCSCScreens.VerifyWebView} component={WebViewScreen} />
      <Stack.Screen
        name={BCSCScreens.StartCall}
        component={StartCallScreen}
        options={{ header: createProgressHeader(5, 60) }}
      />
      <Stack.Screen name={BCSCScreens.LiveCall} component={LiveCallScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={BCSCScreens.VerifyNotComplete}
        component={VerifyNotCompleteScreen}
        options={{ header: createProgressHeader(5, 60) }}
      />
      <Stack.Screen
        name={BCSCScreens.CallBusyOrClosed}
        component={CallBusyOrClosedScreen}
        options={{ header: createProgressHeader(5, 50) }}
      />
      <Stack.Screen
        name={BCSCScreens.ResidentialAddress}
        component={ResidentialAddressScreen}
        options={{
          header: createProgressHeader(3, 50),
          headerLeft: VerifyResumeHeaderBackButton,
        }}
      />
      <Stack.Screen name={BCSCScreens.VerifySettings} component={VerifySettingsScreen} />
      <Stack.Screen name={BCSCScreens.VerifyAutoLock} component={AutoLockScreen} />
      <Stack.Screen
        name={BCSCScreens.VerifyNotificationSettings}
        component={NotificationSettingsScreen}
        options={{ title: t('BCSC.Settings.Notifications') }}
      />
      <Stack.Screen name={BCSCScreens.VerifyAppSecurity} component={VerifyChangeSecurityScreen} />
      <Stack.Screen name={BCSCScreens.VerifyChangePIN} component={VerifyChangePINScreen} />

      <Stack.Screen
        name={BCSCScreens.TransferAccountInstructions}
        component={TransferInstructionsScreen}
        options={({ navigation }) => ({
          // This screen can be the stack's initial route when the user resumes a transfer
          // (accountSetupType persisted); with nothing beneath it, back returns to the setup
          // question instead so the user can still choose a traditional setup.
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              onPress={() =>
                navigation.canGoBack() ? navigation.goBack() : navigation.replace(BCSCScreens.AccountSetup)
              }
            />
          ),
          headerRight: createFloatingHelpMenuButton({
            webViewScreen: BCSCScreens.VerifyWebView,
            learnMoreUrl: HelpCentreUrl.QUICK_SETUP_OF_ADDITIONAL_DEVICES,
          }),
        })}
      />
      <Stack.Screen
        name={BCSCScreens.TransferAccountQRScan}
        component={TransferQRScannerScreen}
        options={{
          title: t('BCSC.Screens.TransferAccountScan'),
          headerRight: createFloatingHelpMenuButton({
            webViewScreen: BCSCScreens.VerifyWebView,
            learnMoreUrl: HelpCentreUrl.QUICK_SETUP_OF_ADDITIONAL_DEVICES,
          }),
        }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyRemoveAccountConfirmation}
        component={VerifyRemoveAccountConfirmationScreen}
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
        name={BCSCModals.VerificationSessionExpired}
        component={VerificationSessionExpired}
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
    </Stack.Navigator>
  )
}

export default VerifyStack
