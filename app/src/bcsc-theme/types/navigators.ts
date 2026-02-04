import { NavigatorScreenParams } from '@react-navigation/native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import { BCSCReason } from '../utils/id-token'

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

export enum BCSCScreens {
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  ForgetAllPairings = 'BCSCForgetAllPairings',
  SetupSteps = 'BCSCSetupSteps',
  IdentitySelection = 'BCSCIdentitySelection',
  SerialInstructions = 'BCSCSerialInstructions',
  ManualSerial = 'BCSCManualSerial',
  ScanSerial = 'BCSCScanSerial',
  EnterBirthdate = 'BCSCEnterBirthdate',
  MismatchedSerial = 'BCSCMismatchedSerial',
  BirthdateLockout = 'BCSCBirthdateLockout',
  EnterEmail = 'BCSCEnterEmail',
  EmailConfirmation = 'BCSCEmailConfirmation',
  VerificationMethodSelection = 'BCSCVerificationMethodSelection',
  VerifyInPerson = 'BCSCVerifyInPerson',
  InformationRequired = 'BCSCInformationRequired',
  PhotoInstructions = 'BCSCPhotoInstructions',
  TakePhoto = 'BCSCTakePhoto',
  PhotoReview = 'BCSCPhotoReview',
  VideoInstructions = 'BCSCVideoInstructions',
  TakeVideo = 'BCSCTakeVideo',
  VideoReview = 'BCSCVideoReview',
  VideoTooLong = 'BCSCVideoTooLong',
  PendingReview = 'BCSCPendingReview',
  CancelledReview = 'BCSCCancelledReview',
  SuccessfullySent = 'BCSCSuccessfullySent',
  VerificationSuccess = 'BCSCVerificationSuccess',
  ManualPairingCode = 'BCSCManualPairingCode',
  PairingConfirmation = 'BCSCPairingConfirmation',
  AdditionalIdentificationRequired = 'BCSCAdditionalIdentificationRequired',
  DualIdentificationRequired = 'BCSCDualIdentificationRequired',
  IDPhotoInformation = 'BCSCIDPhotoInformation',
  EvidenceTypeList = 'BCSCEvidenceTypeList',
  EvidenceCapture = 'BCSCEvidenceCapture',
  EvidenceIDCollection = 'BCSCEvidenceIDCollection',
  BeforeYouCall = 'BCSCBeforeYouCall',
  StartCall = 'BCSCStartCall',
  CallBusyOrClosed = 'BCSCCallBusyOrClosed',
  LiveCall = 'BCSCLiveCall',
  VerifyNotComplete = 'BCSCVerifyNotComplete',
  ResidentialAddress = 'BCSCResidentialAddress',
  RemoveAccountConfirmation = 'BCSCRemoveAccountConfirmation',
  TransferAccountInformation = 'BCSCTransferAccountInformation',
  TransferAccountInstructions = 'BCSCTransferAccountInstructions',
  TransferAccountQRDisplay = 'BCSCTransferAccountQRDisplay',
  TransferAccountQRScan = 'BCSCTransferAccountQRScan',
  TransferAccountQRInformation = 'BCSCTransferQRInformation',
  TransferAccountSuccess = 'BCSCTransferAccountSuccess',
  ServiceLogin = 'BCSCServiceLogin',
  NicknameAccount = 'BCSCNicknameAccount',
  EditNickname = 'BCSCEditNickname',
  OnboardingAccountSetup = 'BCSCOnboardingAccountSetup',
  OnboardingSetupTypes = 'BCSCOnboardingSetupTypes',
  OnboardingIntroCarousel = 'BCSCOnboardingIntroCarousel',
  OnboardingPrivacyPolicy = 'BCSCOnboardingPrivacyPolicy',
  OnboardingTermsOfUse = 'BCSCOnboardingTermsOfUse',
  OnboardingNotifications = 'BCSCOnboardingNotifications',
  OnboardingSecureApp = 'BCSCOnboardingSecureApp',
  OnboardingCreatePIN = 'BCSCOnboardingCreatePIN',
  OnboardingOptInAnalytics = 'BCSCOnboardingOptInAnalytics',
  OnboardingWebView = 'BCSCOnboardingWebview',
  OnboardingDeveloper = 'BCSCOnboardingDeveloper',
  MainLoading = 'BCSCMainLoading',
  MainSettings = 'BCSCMainSettings',
  MainWebView = 'BCSCMainWebView',
  MainContactUs = 'BCSCMainContactUs',
  MainPrivacyPolicy = 'BCSCMainPrivacyPolicy',
  MainDeveloper = 'BCSCMainDeveloper',
  MainAutoLock = 'BCSCMainAutoLock',
  MainAppSecurity = 'BCSCMainAppSecurity',
  MainChangePIN = 'BCSCMainChangePIN',
  VerifySettings = 'BCSCVerifySettings',
  VerifyWebView = 'BCSCVerifyWebView',
  VerifyAutoLock = 'BCSCVerifyAutoLock',
  VerifyAppSecurity = 'BCSCVerifyAppSecurity',
  VerifyContactUs = 'BCSCVerifyContactUs',
  VerifyPrivacyPolicy = 'BCSCVerifyPrivacyPolicy',
  VerifyDeveloper = 'BCSCVerifyDeveloper',
  VerifyChangePIN = 'BCSCVerifyChangePIN',
  AccountExpired = 'BCSCAccountExpired',
  AccountRenewalInformation = 'BCSCAccountRenewalInformation',
  AccountRenewalFirstWarning = 'BCSCAccountRenewalFirstWarning',
  AccountRenewalFinalWarning = 'BCSCAccountRenewalFinalWarning',
  AccountSelector = 'BCSCAccountSelector',
  EnterPIN = 'BCSCEnterPIN',
  DeviceAuthInfo = 'BCSCDeviceAuthInfo',
  Lockout = 'BCSCLockout',
  DeviceAuthAppReset = 'BCSCDeviceAuthAppReset',
  AuthSettings = 'BCSCAuthSettings',
  AuthWebView = 'BCSCAuthWebView',
  AuthContactUs = 'BCSCAuthContactUs',
  AuthPrivacyPolicy = 'BCSCAuthPrivacyPolicy',
  AuthDeveloper = 'BCSCAuthDeveloper',
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
  [BCSCScreens.MismatchedSerial]: undefined
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
  [BCSCScreens.EvidenceTypeList]: { cardProcess: BCSCCardProcess }
  [BCSCScreens.EvidenceCapture]: { cardType: EvidenceType }
  [BCSCScreens.EvidenceIDCollection]: { cardType: EvidenceType }
  [BCSCScreens.BeforeYouCall]: { formattedHours?: string }
  [BCSCScreens.StartCall]: undefined
  [BCSCScreens.CallBusyOrClosed]: { busy: boolean; formattedHours?: string }
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
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
  [BCSCScreens.RemoveAccountConfirmation]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.TransferAccountQRDisplay]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.TransferAccountQRInformation]: undefined
  [BCSCScreens.ServiceLogin]: {
    serviceClientId?: string
    serviceTitle?: string
    pairingCode?: string
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
