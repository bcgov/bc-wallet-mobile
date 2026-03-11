import { NavigatorScreenParams } from '@react-navigation/native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import { VerificationCardError } from '../features/verify/verificationCardError'
import { BCSCReason } from '../utils/id-token'
import { FormattedServicePeriod } from '../utils/service-hours-formatter'

export enum BCSCStacks {
  Onboarding = 'BCSCOnboardingStack',
  Auth = 'BCSCAuthStack',
  Verify = 'BCSCVerifyStack',
  Tab = 'BCSCTabStack',
  Main = 'BCSCMainStack',
}

export enum BCSCModals {
  InternetDisconnected = 'BCSCNoInternet',
  MandatoryUpdate = 'BCSCMandatoryUpdate',
  DeviceInvalidated = 'BCSCDeviceInvalidated',
}

/**
 * BCSC Screens enum
 *
 * Note: These values are attempting to align with V3 screen names where possible.
 * Due to react-navigation requirements, some screen names are prefixed with their stack name (e.g. BCSCOnboardingStack) to ensure uniqueness across the app.
 * This is resolved later using `getBaseScreenName` when we pass the screen name view event to Snowplow analytics.
 */
export enum BCSCScreens {
  Home = 'Home',
  Services = 'Service List',
  Account = 'Account Details',
  ForgetAllPairings = 'Forget All Pairings',
  SetupSteps = 'Setup Steps',
  IdentitySelection = 'New Setup ID Confirmation',
  SerialInstructions = 'Scan Card Instructions',
  ManualSerial = 'Manual Card Entry',
  ScanSerial = 'Scan Card',
  EnterBirthdate = 'Birthdate',
  VerificationCardError = 'Card Status Error',
  BirthdateLockout = 'Too Many Add Attempts',
  EnterEmail = 'Email Entry',
  EmailConfirmation = 'Email Verification',
  VerificationMethodSelection = 'Verify Options',
  VerifyInPerson = 'Verify In Person Instruction',
  InformationRequired = 'Send Video Menu',
  PhotoInstructions = 'Selfie Photo Tips',
  TakePhoto = 'Selfie Photo Capture',
  PhotoReview = 'Selfie Photo Confirmation',
  VideoInstructions = 'Selfie Video Tips',
  TakeVideo = 'Selfie Video Capture',
  VideoReview = 'Selfie Video Confirmation',
  VideoTooLong = 'Selfie Video Too Long',
  PendingReview = 'Send Video Check Status',
  CancelledReview = 'BCSCCancelledReview', // FIXME (MD): Not sure which V3 screen this maps to...
  SuccessfullySent = 'Send Video Received Request Confirmation',
  VerificationSuccess = 'Setup Complete',
  ManualPairingCode = 'Login Device Pairing',
  PairingConfirmation = 'Login Complete with Paired Device',
  AdditionalIdentificationRequired = 'Photo ID Required',
  DualIdentificationRequired = 'BCSCDualIdentificationRequired', // FIXME (MD): Not sure which V3 screen this maps to...
  IDPhotoInformation = 'ID Photo Instructions',
  /**
   * FIXME (MD): EvidenceTypeList screen in V4 maps to multiple screens in V3
   *
   * Screens:
   * Secondary ID Options for Non-BCSC
   * Secondary ID for Non-Photo BC Services Card
   * Foundation Photo ID Options for Non-Photo BCSC
   * Foundation ID Options for Non-BCSC
   * Foundation Non-Photo ID Options for Non-Photo BCSC
   */
  EvidenceTypeList = 'BCSCEvidenceTypeList',
  EvidenceCapture = 'Document Photo Capture',
  EvidenceIDCollection = 'Secondary ID Document Data Entry',
  BeforeYouCall = 'Verify by Video Call Prep',
  StartCall = 'Video Verify Call Now Progress',
  CallBusyOrClosed = 'Video Verify Closed',
  LiveCall = 'Video Call: In-Call',
  VerifyNotComplete = 'Video Verify Incomplete',
  ResidentialAddress = 'Address Entry',
  MainRemoveAccountConfirmation = `${BCSCStacks.Main} Reset App Warning`,
  VerifyRemoveAccountConfirmation = `${BCSCStacks.Verify} Reset App Warning`,
  OnboardingRemoveAccountConfirmation = `${BCSCStacks.Onboarding} Reset App Warning`,
  TransferAccountInformation = 'Transfer Steps',
  TransferAccountInstructions = 'QR Get Instructions',
  TransferAccountQRDisplay = 'QR Code Display',
  TransferAccountQRScan = 'Scan QR Code',
  TransferAccountQRInformation = 'QR Get Overview',
  TransferAccountSuccess = 'QR Code Scan Complete',
  ServiceLogin = 'Login Request',
  NicknameAccount = 'Choose Account Nickname',
  EditNickname = 'Change Account Nickname',
  OnboardingAccountSetup = 'Start Setup',
  OnboardingSetupTypes = 'Setup Options',
  OnboardingIntroCarousel = 'Intro',
  OnboardingPrivacyPolicy = `${BCSCStacks.Onboarding} Privacy Information`,
  OnboardingTermsOfUse = 'Terms of Use Screen',
  OnboardingNotifications = 'Notification Prep',
  OnboardingSecureApp = 'App Security Options',
  OnboardingCreatePIN = 'Choose PIN',
  OnboardingOptInAnalytics = 'Analytics Opt In', // NOTE: New V4 screen, not in V3
  OnboardingWebView = `${BCSCStacks.Onboarding} Web view`,
  OnboardingDeveloper = `${BCSCStacks.Onboarding} Developer`,
  MainLoading = `${BCSCStacks.Main} Loading`,
  MainSettings = `${BCSCStacks.Main} In App Settings`,
  MainWebView = `${BCSCStacks.Main} Web view`,
  MainContactUs = `${BCSCStacks.Main} Contact Us`,
  MainPrivacyPolicy = `${BCSCStacks.Main} Privacy Information`,
  MainDeveloper = `${BCSCStacks.Main} Developer`,
  MainAutoLock = 'BCSCMainAutoLock',
  MainAppSecurity = `${BCSCStacks.Main} App Security Setting`,
  MainChangePIN = `${BCSCStacks.Main} Change PIN`,
  VerifySettings = `${BCSCStacks.Verify} In App Settings`,
  VerifyWebView = `${BCSCStacks.Verify} Web view`,
  VerifyAutoLock = 'BCSCVerifyAutoLock',
  VerifyAppSecurity = `${BCSCStacks.Verify} App Security Setting`,
  VerifyContactUs = `${BCSCStacks.Verify} Contact Us`,
  VerifyPrivacyPolicy = `${BCSCStacks.Verify} Privacy Information`,
  VerifyDeveloper = `${BCSCStacks.Verify} Developer`,
  VerifyChangePIN = `${BCSCStacks.Verify} Change PIN`,
  AccountExpired = 'BCSCAccountExpired',
  AccountRenewalInformation = 'Renewal ID requirements',
  AccountRenewalFirstWarning = 'Renewal Instructions',
  AccountRenewalFinalWarning = 'Renewal Warning',
  AccountSelector = 'Account Select',
  EnterPIN = 'Enter/Verify PIN',
  DeviceAuthInfo = 'Device Authentication Prep',
  Lockout = 'Too many PIN attempts',
  DeviceAuthAppReset = 'App Reset for Security',
  AuthSettings = `${BCSCStacks.Auth} In App Settings`,
  AuthWebView = `${BCSCStacks.Auth} Web view`,
  AuthContactUs = `${BCSCStacks.Auth} Contact Us`,
  AuthPrivacyPolicy = `${BCSCStacks.Auth} Privacy Information`,
  AuthDeveloper = `${BCSCStacks.Auth} Developer`,
}

export type BCSCOnboardingStackParams = {
  [BCSCScreens.OnboardingWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.OnboardingAccountSetup]: undefined
  [BCSCScreens.OnboardingSetupTypes]: undefined
  [BCSCScreens.TransferAccountInformation]: undefined
  [BCSCScreens.OnboardingIntroCarousel]: undefined
  [BCSCScreens.OnboardingPrivacyPolicy]: undefined
  [BCSCScreens.OnboardingTermsOfUse]: undefined
  [BCSCScreens.OnboardingNotifications]: undefined
  [BCSCScreens.OnboardingSecureApp]: undefined
  [BCSCScreens.OnboardingCreatePIN]: undefined
  [BCSCScreens.OnboardingOptInAnalytics]: undefined
  [BCSCScreens.OnboardingDeveloper]: undefined
  [BCSCScreens.OnboardingRemoveAccountConfirmation]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
}

export type BCSCVerifyStackParams = {
  [BCSCScreens.VerifyWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.IdentitySelection]: undefined
  [BCSCScreens.SerialInstructions]: undefined
  [BCSCScreens.ManualSerial]: undefined
  [BCSCScreens.ScanSerial]: undefined
  [BCSCScreens.EnterBirthdate]: undefined
  [BCSCScreens.VerificationCardError]: { errorType: VerificationCardError }
  [BCSCScreens.BirthdateLockout]: undefined
  [BCSCScreens.EnterEmail]: { cardProcess: BCSCCardProcess }
  [BCSCScreens.EmailConfirmation]: { emailAddressId: string }
  [BCSCScreens.VerificationMethodSelection]: undefined
  [BCSCScreens.VerifyInPerson]: undefined
  [BCSCScreens.InformationRequired]: undefined
  [BCSCScreens.PhotoInstructions]: { forLiveCall: boolean }
  [BCSCScreens.TakePhoto]: {
    deviceSide: 'front' | 'back'
    cameraLabel: string
    cameraInstructions: string
    forLiveCall: boolean
  }
  [BCSCScreens.PhotoReview]: { photoPath: string; forLiveCall: boolean }
  [BCSCScreens.VideoInstructions]: undefined
  [BCSCScreens.TakeVideo]: undefined
  [BCSCScreens.VideoReview]: { videoPath: string; videoThumbnailPath: string }
  [BCSCScreens.VideoTooLong]: { videoLengthSeconds: number }
  [BCSCScreens.SuccessfullySent]: undefined
  [BCSCScreens.PendingReview]: undefined
  [BCSCScreens.CancelledReview]: { agentReason?: string }
  [BCSCScreens.VerificationSuccess]: undefined
  [BCSCScreens.AdditionalIdentificationRequired]: undefined
  [BCSCScreens.DualIdentificationRequired]: undefined
  [BCSCScreens.IDPhotoInformation]: { cardType: EvidenceType }
  [BCSCScreens.EvidenceTypeList]: { cardProcess: BCSCCardProcess; photoFilter?: 'photo' | 'nonPhoto' }
  [BCSCScreens.EvidenceCapture]: { cardType: EvidenceType }
  [BCSCScreens.EvidenceIDCollection]: { cardType: EvidenceType; documentNumber?: string }
  [BCSCScreens.BeforeYouCall]: { formattedHours: FormattedServicePeriod[] }
  [BCSCScreens.StartCall]: undefined
  [BCSCScreens.CallBusyOrClosed]: { busy: boolean; formattedHours: FormattedServicePeriod[] }
  [BCSCScreens.LiveCall]: undefined
  [BCSCScreens.VerifyNotComplete]: undefined
  [BCSCScreens.ResidentialAddress]: undefined
  [BCSCScreens.NicknameAccount]: undefined
  [BCSCScreens.VerifySettings]: undefined
  [BCSCScreens.VerifyPrivacyPolicy]: undefined
  [BCSCScreens.VerifyContactUs]: undefined
  [BCSCScreens.VerifyDeveloper]: undefined
  [BCSCScreens.VerifyAutoLock]: undefined
  [BCSCScreens.VerifyAppSecurity]: undefined
  [BCSCScreens.VerifyChangePIN]: { isChangingExistingPIN?: boolean } | undefined
  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
  [BCSCScreens.TransferAccountInstructions]: undefined
  [BCSCScreens.TransferAccountQRScan]: undefined
  [BCSCScreens.VerifyRemoveAccountConfirmation]: undefined
}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
}

export type BCSCMainStackParams = {
  [BCSCStacks.Tab]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.MainLoading]: undefined
  [BCSCScreens.MainWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string; fromAppSwitch?: boolean }
  [BCSCScreens.MainRemoveAccountConfirmation]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.TransferAccountQRDisplay]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.TransferAccountQRInformation]: undefined
  [BCSCScreens.ServiceLogin]: {
    serviceClientId?: string
    serviceTitle?: string
    pairingCode?: string
    fromAppSwitch?: boolean
  }
  [BCSCScreens.MainSettings]: undefined
  [BCSCScreens.MainPrivacyPolicy]: undefined
  [BCSCScreens.MainContactUs]: undefined
  [BCSCScreens.ForgetAllPairings]: undefined
  [BCSCScreens.EditNickname]: undefined
  [BCSCScreens.MainDeveloper]: undefined
  [BCSCScreens.MainAutoLock]: undefined
  [BCSCScreens.MainAppSecurity]: undefined
  [BCSCScreens.MainChangePIN]: { isChangingExistingPIN?: boolean } | undefined
  [BCSCScreens.AccountExpired]: undefined
  [BCSCScreens.AccountRenewalInformation]: undefined
  [BCSCScreens.AccountRenewalFirstWarning]: undefined
  [BCSCScreens.AccountRenewalFinalWarning]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
  [BCSCModals.DeviceInvalidated]: { invalidationReason: BCSCReason }
}

export type BCSCAuthStackParams = {
  [BCSCScreens.AccountSelector]: undefined
  [BCSCScreens.EnterPIN]: undefined
  [BCSCScreens.DeviceAuthInfo]: undefined
  [BCSCScreens.Lockout]: undefined
  [BCSCScreens.DeviceAuthAppReset]: undefined
  [BCSCScreens.AuthSettings]: undefined
  [BCSCScreens.AuthWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.AuthContactUs]: undefined
  [BCSCScreens.AuthPrivacyPolicy]: undefined
  [BCSCScreens.AuthDeveloper]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
}
