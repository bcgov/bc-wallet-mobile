import { NavigatorScreenParams } from '@react-navigation/native'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { BCSCCardType } from './cards'

export enum BCSCStacks {
  TabStack = 'BCSCTabStack',
  OnboardingStack = 'BCSCOnboardingStack',
}

export enum BCSCScreens {
  Splash = 'BCSCSplash',
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  WebView = 'BCSCWebView',
  Settings = 'BCSCSettings',
  ContactUs = 'BCSCContactUs',
  HelpCentre = 'BCSCHelpCentre',
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
  EvidenceTypeList = 'EvidenceTypeList',
  EvidenceCapture = 'BCSCEvidenceCapture',
  EvidenceIDCollection = 'BCSCEvidenceIDCollection',
  BeforeYouCall = 'BCSCBeforeYouCall',
  StartCall = 'BCSCStartCall',
  CallBusyOrClosed = 'BCSCCallBusyOrClosed',
  LiveCall = 'BCSCLiveCall',
  VerifyNotComplete = 'BCSCVerifyNotComplete',
  ResidentialAddress = 'BCSCResidentialAddress',
  RemoveAccountConfirmation = 'RemoveAccountConfirmation',
  TransferAccountInformation = 'TransferAccountInformation',
  TransferAccountInstructions = 'TransferAccountInstructions',
  TransferAccountQRDisplay = 'TransferAccountQRDisplay',
  TransferAccountQRScan = 'TransferAccountQRScan',
  TransferAccountQRInformation = 'TransferQRInformation',
  TransferAccountSuccess = 'TransferAccountSuccess',
  ServiceLogin = 'ServiceLogin',
  NicknameAccount = 'NicknameAccount',
  EditNickname = 'EditNickname',
  AccountSelector = 'AccountSelector',
  OnboardingIntroCarousel = 'BCSCOnboardingIntroCarousel',
  PrivacyPolicy = 'BCSCPrivacyPolicy',
  OnboardingTermsOfUse = 'BCSCOnboardingTermsOfUse',
  OnboardingNotifications = 'BCSCOnboardingNotifications',
  OnboardingSecureApp = 'BCSCOnboardingSecureApp',
  OnboardingCreatePIN = 'BCSCOnboardingCreatePIN',
}

export enum BCSCModals {
  InternetDisconnected = 'BCSCNoInternet',
}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
}

export type BCSCRootStackParams = {
  [BCSCStacks.TabStack]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.WebView]: { url: string; title: string }
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
  [BCSCScreens.RemoveAccountConfirmation]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.TransferAccountQRDisplay]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.TransferAccountQRInformation]: undefined
  [BCSCScreens.ServiceLogin]: { serviceClient: ClientMetadata }
  [BCSCScreens.Settings]: undefined
  [BCSCScreens.PrivacyPolicy]?: { interactive?: boolean }
  [BCSCScreens.ContactUs]: undefined
  [BCSCScreens.HelpCentre]: undefined
  [BCSCScreens.ForgetAllPairings]: undefined
  [BCSCScreens.EditNickname]: undefined
  [BCSCModals.InternetDisconnected]: undefined
}

export type BCSCOnboardingStackParams = {
  [BCSCScreens.Settings]: undefined
  [BCSCScreens.OnboardingIntroCarousel]: undefined
  [BCSCScreens.PrivacyPolicy]?: { interactive?: boolean }
  [BCSCScreens.OnboardingTermsOfUse]: undefined
  [BCSCScreens.OnboardingNotifications]: undefined
  [BCSCScreens.OnboardingSecureApp]: undefined
  [BCSCScreens.OnboardingCreatePIN]: undefined
}

export type BCSCVerifyIdentityStackParams = {
  [BCSCScreens.NewSetup]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.SetupTypes]: undefined
  [BCSCScreens.TransferAccountInstructions]: undefined
  [BCSCScreens.TransferAccountQRScan]: undefined
  [BCSCScreens.TransferAccountInformation]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.WebView]: { url: string; title: string }
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
  [BCSCScreens.Settings]: undefined
  [BCSCModals.InternetDisconnected]: undefined
}
