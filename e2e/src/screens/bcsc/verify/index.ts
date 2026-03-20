// check_status/
import CancelledReviewE2EScreen from './check_status/CancelledReview.e2e.js'
import PendingReviewE2EScreen from './check_status/PendingReview.e2e.js'
import VerificationSuccessE2EScreen from './check_status/VerificationSuccess.e2e.js'
import VerifyNotCompleteE2EScreen from './check_status/VerifyNotComplete.e2e.js'
// modals/
import PermissionDisabledE2EScreen from './modals/PermissionDisabled.e2e.js'
import VerifySettingsE2EScreen from './modals/VerifySettings.e2e.js'
import VerifyWebViewE2EScreen from './modals/VerifyWebView.e2e.js'
// root
import SetupStepsE2EScreen from './SetupSteps.e2e.js'
// step_1/
import NicknameE2EScreen from './step_1/Nickname.e2e.js'
// step_2/
import IdentitySelectionE2EScreen from './step_2/IdentitySelection.e2e.js'
import EnterBirthdateE2EScreen from './step_2/bcsc_card/EnterBirthdate.e2e.js'
import ManualSerialE2EScreen from './step_2/bcsc_card/ManualSerial.e2e.js'
import ScanSerialE2EScreen from './step_2/bcsc_card/ScanSerial.e2e.js'
import SerialInstructionsE2EScreen from './step_2/bcsc_card/SerialInstructions.e2e.js'
import BirthdateLockoutE2EScreen from './step_2/bcsc_card/error/BirthdateLockout.e2e.js'
import VerificationCardErrorE2EScreen from './step_2/bcsc_card/error/VerificationCardError.e2e.js'
import AdditionalIdentificationRequiredE2EScreen from './step_2/other_id/AdditionalIdentificationRequired.e2e.js'
import DualIdentificationRequiredE2EScreen from './step_2/other_id/DualIdentificationRequired.e2e.js'
import EvidenceCaptureE2EScreen from './step_2/other_id/EvidenceCapture.e2e.js'
import EvidenceIDCollectionE2EScreen from './step_2/other_id/EvidenceIDCollection.e2e.js'
import EvidenceTypeListE2EScreen from './step_2/other_id/EvidenceTypeList.e2e.js'
import IDPhotoInformationE2EScreen from './step_2/other_id/IDPhotoInformation.e2e.js'
// step_3/
import ResidentialAddressE2EScreen from './step_3/ResidentialAddress.e2e.js'
// step_4/
import EmailConfirmationE2EScreen from './step_4/EmailConfirmation.e2e.js'
import EnterEmailE2EScreen from './step_4/EnterEmail.e2e.js'
// step_5/
import VerificationMethodSelectionE2EScreen from './step_5/VerificationMethodSelection.e2e.js'
import VerifyInPersonE2EScreen from './step_5/in_person/VerifyInPerson.e2e.js'
import BeforeYouCallE2EScreen from './step_5/live_call/BeforeYouCall.e2e.js'
import CallBusyOrClosedE2EScreen from './step_5/live_call/CallBusyOrClosed.e2e.js'
import LiveCallE2EScreen from './step_5/live_call/LiveCall.e2e.js'
import StartCallE2EScreen from './step_5/live_call/StartCall.e2e.js'
import InformationRequiredE2EScreen from './step_5/send_video/InformationRequired.e2e.js'
import PhotoInstructionsE2EScreen from './step_5/send_video/PhotoInstructions.e2e.js'
import PhotoReviewE2EScreen from './step_5/send_video/PhotoReview.e2e.js'
import SuccessfullySentE2EScreen from './step_5/send_video/SuccessfullySent.e2e.js'
import TakePhotoE2EScreen from './step_5/send_video/TakePhoto.e2e.js'
import TakeVideoE2EScreen from './step_5/send_video/TakeVideo.e2e.js'
import VideoInstructionsE2EScreen from './step_5/send_video/VideoInstructions.e2e.js'
import VideoReviewE2EScreen from './step_5/send_video/VideoReview.e2e.js'
import VideoTooLongE2EScreen from './step_5/send_video/VideoTooLong.e2e.js'

/** Nested shape mirrors `e2e/src/screens/bcsc/verify/` */
const screens = {
  check_status: {
    CancelledReviewE2EScreen,
    PendingReviewE2EScreen,
    VerificationSuccessE2EScreen,
    VerifyNotCompleteE2EScreen,
  },
  modals: {
    PermissionDisabledE2EScreen,
    VerifySettingsE2EScreen,
    VerifyWebViewE2EScreen,
  },
  setup: {
    SetupStepsE2EScreen,
  },
  step_1: {
    NicknameE2EScreen,
  },
  step_2: {
    IdentitySelectionE2EScreen,
    bcsc_card: {
      EnterBirthdateE2EScreen,
      ManualSerialE2EScreen,
      ScanSerialE2EScreen,
      SerialInstructionsE2EScreen,
      error: {
        BirthdateLockoutE2EScreen,
        VerificationCardErrorE2EScreen,
      },
    },
    other_id: {
      AdditionalIdentificationRequiredE2EScreen,
      DualIdentificationRequiredE2EScreen,
      EvidenceCaptureE2EScreen,
      EvidenceIDCollectionE2EScreen,
      EvidenceTypeListE2EScreen,
      IDPhotoInformationE2EScreen,
    },
  },
  step_3: {
    ResidentialAddressE2EScreen,
  },
  step_4: {
    EmailConfirmationE2EScreen,
    EnterEmailE2EScreen,
  },
  step_5: {
    VerificationMethodSelectionE2EScreen,
    in_person: {
      VerifyInPersonE2EScreen,
    },
    live_call: {
      BeforeYouCallE2EScreen,
      CallBusyOrClosedE2EScreen,
      LiveCallE2EScreen,
      StartCallE2EScreen,
    },
    send_video: {
      InformationRequiredE2EScreen,
      PhotoInstructionsE2EScreen,
      PhotoReviewE2EScreen,
      SuccessfullySentE2EScreen,
      TakePhotoE2EScreen,
      TakeVideoE2EScreen,
      VideoInstructionsE2EScreen,
      VideoReviewE2EScreen,
      VideoTooLongE2EScreen,
    },
  },
} as const

export default screens

export {
  AdditionalIdentificationRequiredE2EScreen,
  BeforeYouCallE2EScreen,
  BirthdateLockoutE2EScreen,
  CallBusyOrClosedE2EScreen,
  CancelledReviewE2EScreen,
  DualIdentificationRequiredE2EScreen,
  EmailConfirmationE2EScreen,
  EnterBirthdateE2EScreen,
  EnterEmailE2EScreen,
  EvidenceCaptureE2EScreen,
  EvidenceIDCollectionE2EScreen,
  EvidenceTypeListE2EScreen,
  IDPhotoInformationE2EScreen,
  IdentitySelectionE2EScreen,
  InformationRequiredE2EScreen,
  LiveCallE2EScreen,
  ManualSerialE2EScreen,
  NicknameE2EScreen,
  PendingReviewE2EScreen,
  PermissionDisabledE2EScreen,
  PhotoInstructionsE2EScreen,
  PhotoReviewE2EScreen,
  ResidentialAddressE2EScreen,
  ScanSerialE2EScreen,
  SerialInstructionsE2EScreen,
  SetupStepsE2EScreen,
  StartCallE2EScreen,
  SuccessfullySentE2EScreen,
  TakePhotoE2EScreen,
  TakeVideoE2EScreen,
  VerificationCardErrorE2EScreen,
  VerificationMethodSelectionE2EScreen,
  VerificationSuccessE2EScreen,
  VerifyInPersonE2EScreen,
  VerifyNotCompleteE2EScreen,
  VerifySettingsE2EScreen,
  VerifyWebViewE2EScreen,
  VideoInstructionsE2EScreen,
  VideoReviewE2EScreen,
  VideoTooLongE2EScreen,
}
