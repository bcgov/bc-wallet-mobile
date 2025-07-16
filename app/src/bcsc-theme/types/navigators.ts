import { NavigatorScreenParams } from '@react-navigation/native'

export enum BCSCStacks {
  TabStack = 'BCSCTabStack',
}

export enum BCSCScreens {
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  Settings = 'BCSCSettings',
  SetupSteps = 'BCSCSetupSteps',
  IdentitySelection = 'BCSCIdentitySelection',
  SerialInstructions = 'BCSCSerialInstructions',
  ManualSerial = 'BCSCManualSerial',
  ScanSerial = 'BCSCScanSerial',
  EnterBirthdate = 'BCSCEnterBirthdate',
  MismatchedSerial = 'BCSCMismatchedSerial',
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
}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
  [BCSCScreens.Settings]: undefined
}

export type BCSCRootStackParams = {
  [BCSCStacks.TabStack]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
}

export type BCSCVerifyIdentityStackParams = {
  [BCSCScreens.SetupSteps]: undefined
  [BCSCScreens.IdentitySelection]: undefined
  [BCSCScreens.SerialInstructions]: undefined
  [BCSCScreens.ManualSerial]: undefined
  [BCSCScreens.ScanSerial]: undefined
  [BCSCScreens.EnterBirthdate]: undefined
  [BCSCScreens.MismatchedSerial]: undefined
  [BCSCScreens.VerificationMethodSelection]: undefined
  [BCSCScreens.VerifyInPerson]: undefined
  [BCSCScreens.InformationRequired]: undefined
  [BCSCScreens.PhotoInstructions]: undefined
  [BCSCScreens.TakePhoto]: undefined
  [BCSCScreens.PhotoReview]: { photoPath: string }
  [BCSCScreens.VideoInstructions]: undefined
  [BCSCScreens.TakeVideo]: undefined
  [BCSCScreens.VideoReview]: { videoPath: string, videoThumbnailPath: string }
  [BCSCScreens.VideoTooLong]: { videoLengthSeconds: number }
  [BCSCScreens.SuccessfullySent]: undefined
  [BCSCScreens.PendingReview]: undefined
  [BCSCScreens.VerificationSuccess]: undefined
}
