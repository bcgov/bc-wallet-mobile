import { NavigatorScreenParams } from '@react-navigation/native'
import { EvidenceType } from '../api/hooks/useEvidenceApi'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
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
  SetupTypes = 'BCSCSetupTypes',
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
  BeforeYouCall = 'BCSCBeforeYouCall',
  StartCall = 'BCSCStartCall',
  CallBusyOrClosed = 'BCSCCallBusyOrClosed',
  LiveCall = 'BCSCLiveCall',
  VerifyNotComplete = 'BCSCVerifyNotComplete',
  ResidentialAddressScreen = 'BCSCResidentialAddressScreen',
  RemoveAccountConfirmation = 'RemoveAccountConfirmationScreen',
  TransferAccountInformation = 'TransferAccountInformationScreen',
  TransferAccountInstructions = 'TransferAccountInstructionsScreen',
  TransferAccountQRDisplay = 'TransferAccountQRDisplayScreen',
  TransferAccountQRScan = 'TransferAccountQRScanScreen',
  TransferAccountQRInformation = 'TransferQRInformationScreen',
  TransferAccountSuccess = 'TransferAccountSuccessScreen',
  ServiceLoginScreen = 'ServiceLoginScreen',
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
  [BCSCScreens.RemoveAccountConfirmation]: undefined
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.TransferAccountQRDisplay]: undefined
  [BCSCScreens.TransferAccountSuccess]: undefined
  [BCSCScreens.TransferAccountQRInformation]: undefined
  [BCSCScreens.ServiceLoginScreen]: { serviceClient: ClientMetadata }
}

export type BCSCVerifyIdentityStackParams = {
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.SetupTypes]: undefined
  [BCSCScreens.TransferAccountInstructions]: undefined
  [BCSCScreens.TransferAccountQRScan]: undefined
  [BCSCScreens.TransferAccountInformation]: undefined
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
  [BCSCScreens.ResidentialAddressScreen]: undefined
}
