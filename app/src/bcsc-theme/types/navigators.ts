import { NavigatorScreenParams } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { BCSCCardType } from './cards'

export type ModalNavigation = StackNavigationProp<
  BCSCMainStackParams | BCSCVerifyStackParams | BCSCOnboardingStackParams,
  BCSCModals.InternetDisconnected | BCSCModals.MandatoryUpdate
>

export enum BCSCStacks {
  Startup = 'BCSCStartupStack',
  Onboarding = 'BCSCOnboardingStack',
  Verify = 'BCSCVerifyStack',
  Tab = 'BCSCTabStack',
  Main = 'BCSCMainStack',
}

export enum BCSCModals {
  InternetDisconnected = 'BCSCNoInternet',
  MandatoryUpdate = 'BCSCMandatoryUpdate',
}

export enum BCSCScreens {
  Splash = 'BCSCSplash',
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  ForgetAllPairings = 'BCSCForgetAllPairings',
  NewSetup = 'BCSCNewSetup',
  SetupSteps = 'BCSCSetupSteps',
  SetupTypes = 'BCSCSetupTypes',
  IdentitySelection = 'BCSCIdentitySelection',
  SerialInstructions = 'BCSCSerialInstructions',
  ManualSerial = 'BCSCManualSerial',
  ScanSerial = 'BCSCScanSerial',
  EnterBirthdate = 'BCSCEnterBirthdate',
  MismatchedSerial = 'BCSCMismatchedSerial',
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
  AccountSelector = 'BCSCAccountSelector',
  OnboardingIntroCarousel = 'BCSCOnboardingIntroCarousel',
  OnboardingPrivacyPolicy = 'BCSCOnboardingPrivacyPolicy',
  OnboardingTermsOfUse = 'BCSCOnboardingTermsOfUse',
  OnboardingNotifications = 'BCSCOnboardingNotifications',
  OnboardingSecureApp = 'BCSCOnboardingSecureApp',
  OnboardingCreatePIN = 'BCSCOnboardingCreatePIN',
  OnboardingWebView = 'BCSCOnboardingWebview',
  MainSettings = 'BCSCMainSettings',
  MainWebView = 'BCSCMainWebView',
  MainContactUs = 'BCSCMainContactUs',
  MainPrivacyPolicy = 'BCSCMainPrivacyPolicy',
  MainDeveloper = 'BCSCMainDeveloper',
  VerifySettings = 'BCSCVerifySettings',
  VerifyWebView = 'BCSCVerifyWebView',
  VerifyContactUs = 'BCSCVerifyContactUs',
  VerifyPrivacyPolicy = 'BCSCVerifyPrivacyPolicy',
  VerifyDeveloper = 'BCSCVerifyDeveloper',
  AccountExpired = 'BCSCAccountExpired',
  AccountRenewalInformation = 'BCSCAccountRenewalInformation',
  AccountRenewalFirstWarning = 'BCSCAccountRenewalFirstWarning',
  AccountRenewalFinalWarning = 'BCSCAccountRenewalFinalWarning',
}

export type BCSCStartupStackParams = {
  [BCSCScreens.Splash]: undefined
}

export type BCSCOnboardingStackParams = {
  [BCSCScreens.OnboardingWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.OnboardingIntroCarousel]: undefined
  [BCSCScreens.OnboardingPrivacyPolicy]: undefined
  [BCSCScreens.OnboardingTermsOfUse]: undefined
  [BCSCScreens.OnboardingNotifications]: undefined
  [BCSCScreens.OnboardingSecureApp]: undefined
  [BCSCScreens.OnboardingCreatePIN]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
}

export type BCSCVerifyStackParams = {
  [BCSCScreens.VerifyWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.NewSetup]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.SetupTypes]: undefined
  [BCSCScreens.TransferAccountInstructions]: undefined
  [BCSCScreens.TransferAccountQRScan]: undefined
  [BCSCScreens.TransferAccountInformation]: undefined
  [BCSCScreens.IdentitySelection]: undefined
  [BCSCScreens.SerialInstructions]: undefined
  [BCSCScreens.ManualSerial]: undefined
  [BCSCScreens.ScanSerial]: undefined
  [BCSCScreens.EnterBirthdate]: undefined
  [BCSCScreens.MismatchedSerial]: undefined
  [BCSCScreens.EnterEmail]: { cardType: BCSCCardType }
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
  [BCSCScreens.VerificationSuccess]: undefined
  [BCSCScreens.AdditionalIdentificationRequired]: undefined
  [BCSCScreens.DualIdentificationRequired]: undefined
  [BCSCScreens.IDPhotoInformation]: { cardType: EvidenceType }
  [BCSCScreens.EvidenceTypeList]: undefined
  [BCSCScreens.EvidenceCapture]: { cardType: EvidenceType }
  [BCSCScreens.EvidenceIDCollection]: { cardType: EvidenceType }
  [BCSCScreens.BeforeYouCall]: { formattedHours?: string }
  [BCSCScreens.StartCall]: undefined
  [BCSCScreens.CallBusyOrClosed]: { busy: boolean; formattedHours?: string }
  [BCSCScreens.LiveCall]: undefined
  [BCSCScreens.VerifyNotComplete]: undefined
  [BCSCScreens.ResidentialAddress]: undefined
  [BCSCScreens.NicknameAccount]: undefined
  [BCSCScreens.AccountSelector]: undefined
  [BCSCScreens.VerifySettings]: undefined
  [BCSCScreens.VerifyPrivacyPolicy]: undefined
  [BCSCScreens.VerifyContactUs]: undefined
  [BCSCScreens.VerifyDeveloper]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
}

export type BCSCMainStackParams = {
  [BCSCStacks.Tab]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.MainWebView]: { url: string; title: string; injectedJavascript?: string }
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
  [BCSCScreens.RemoveAccountConfirmation]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.TransferAccountQRDisplay]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.TransferAccountQRInformation]: undefined
  [BCSCScreens.ServiceLogin]: { serviceClient: ClientMetadata }
  [BCSCScreens.MainSettings]: undefined
  [BCSCScreens.MainPrivacyPolicy]: undefined
  [BCSCScreens.MainContactUs]: undefined
  [BCSCScreens.ForgetAllPairings]: undefined
  [BCSCScreens.EditNickname]: undefined
  [BCSCScreens.MainDeveloper]: undefined
  [BCSCScreens.AccountExpired]: { accountName: string; accountExpiration: string }
  [BCSCScreens.AccountRenewalInformation]: undefined
  [BCSCScreens.AccountRenewalFirstWarning]: undefined
  [BCSCScreens.AccountRenewalFinalWarning]: undefined

  [BCSCModals.InternetDisconnected]: undefined
  [BCSCModals.MandatoryUpdate]: undefined
}
