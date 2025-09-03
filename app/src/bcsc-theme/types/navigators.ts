import { NavigatorScreenParams } from '@react-navigation/native'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { BCSCCardType } from './cards'

export enum BCSCStacks {
  TabStack = 'BCSCTabStack',
}

export enum BCSCScreens {
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  WebView = 'BCSCWebView',
  Settings = 'BCSCSettings',
  SetupSteps = 'BCSCSetupSteps',
  IdentitySelection = 'BCSCIdentitySelection',
  SerialInstructions = 'BCSCSerialInstructions',
  ManualSerial = 'BCSCManualSerial',
  ScanSerial = 'BCSCScanSerial',
  EnterBirthdate = 'BCSCEnterBirthdate',
  MismatchedSerial = 'BCSCMismatchedSerial',
  EnterEmailScreen = 'BCSCEnterEmailScreen',
  EmailConfirmationScreen = 'BCSCEmailConfirmationScreen',
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
  ResidentialAddressScreen = 'BCSCResidentialAddressScreen',
}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
  [BCSCScreens.Settings]: undefined
}

export type BCSCRootStackParams = {
  [BCSCStacks.TabStack]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.WebView]: { url: string; title: string }
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
}

export type BCSCVerifyIdentityStackParams = {
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.WebView]: { url: string; title: string }
  [BCSCScreens.IdentitySelection]: undefined
  [BCSCScreens.SerialInstructions]: undefined
  [BCSCScreens.ManualSerial]: undefined
  [BCSCScreens.ScanSerial]: undefined
  [BCSCScreens.EnterBirthdate]: undefined
  [BCSCScreens.MismatchedSerial]: undefined
  [BCSCScreens.EnterEmailScreen]: { cardType: BCSCCardType }
  [BCSCScreens.EmailConfirmationScreen]: { emailAddressId: string }
  [BCSCScreens.VerificationMethodSelection]: undefined
  [BCSCScreens.VerifyInPerson]: undefined
  [BCSCScreens.InformationRequired]: undefined
  [BCSCScreens.PhotoInstructions]: undefined
  [BCSCScreens.TakePhoto]: { deviceSide: 'front' | 'back'; cameraLabel: string; cameraInstructions: string }
  [BCSCScreens.PhotoReview]: { photoPath: string }
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
  [BCSCScreens.ResidentialAddressScreen]: undefined
}
