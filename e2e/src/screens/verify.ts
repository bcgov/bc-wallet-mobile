import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Verify stack screen objects — the entry spine. VerifyPrompt itself lives in
 * `./onboarding.ts`: it is the onboarding → verify seam and exists only in that session.
 *
 * Card type is serial-derived on main — the backend `authorizeDevice(serial, dob)` call at the
 * EnterBirthdate submit decides the path; there are no card-type buttons. Later verify work extends
 * this module (method/evidence/email screens); if it grows unwieldy, split into a `verify/` folder
 * and keep a barrel at this path.
 */

const v = TestIds.verify
const { common } = TestIds

/**
 * Add-or-transfer choice (`AccountSetup`) — first screen after VerifyPrompt `Continue`.
 * `primary` (AddAccount, "No, continue setup") → IdentitySelection · `secondary` (TransferAccount)
 * → transfer instructions.
 */
export const AccountSetupScreen = defineScreen({
  self: bcsc(v.accountSetup.addAccount),
  primary: bcsc(v.accountSetup.addAccount),
  secondary: bcsc(v.accountSetup.transferAccount),
  help: bcsc(common.help),
})

/**
 * `IdentitySelection`. `primary` (Scan) → ScanSerial · `secondary` (OtherID) →
 * DualIdentificationRequired (sets the non-BCSC card process).
 */
export const IdentitySelectionScreen = defineScreen({
  self: bcsc(v.identitySelection.scan),
  primary: bcsc(v.identitySelection.scan),
  secondary: bcsc(v.identitySelection.otherId),
  back: bcsc(common.back),
  help: bcsc(common.help),
})

/**
 * Camera scan screen (`ScanSerial`). Mount auto-requests camera permission and the screen swaps its
 * whole tree around that request — loading view while it is pending, PermissionDisabled when denied,
 * camera when granted — so reach it with `reachCameraScreen`, which accepts the OS dialog whenever it
 * lands instead of racing a fixed window against the re-renders.
 *
 * `primary` (EnterManually) is the CI path around the live camera, and it is a deliberately good anchor:
 * the PermissionDisabled fallback renders the SAME testID as its secondary action, so the flow reaches
 * manual entry whether permission was granted or refused — only the loading view lacks it.
 */
export const ScanSerialScreen = defineScreen({
  self: bcsc(v.scanSerial.enterManually),
  primary: bcsc(v.scanSerial.enterManually),
  back: bcsc(common.back),
})

/**
 * Manual serial form (`ManualSerial`). Continue is always enabled — validation runs on press
 * (empty-serial error); the input caps at 15 chars. iOS types into the pressable wrapper,
 * Android into the inner input (the `InputWithValidation` pattern).
 */
export const ManualSerialScreen = defineScreen({
  self: { ios: bcsc(v.manualSerial.serialPressable), android: bcsc(v.manualSerial.serialInput) },
  primary: bcsc(v.manualSerial.continue),
  back: bcsc(common.back),
  inputs: {
    serial: { ios: bcsc(v.manualSerial.serialPressable), android: bcsc(v.manualSerial.serialInput) },
  },
})

/**
 * Birthdate form (`EnterBirthdate`) — a number-pad text field that progressive-formats digits into
 * YYYY/MM/DD (feed it `TestUser.dob`, e.g. "19690913"). `primary` (Continue) validates then fires
 * the backend `authorizeDevice(serial, dob)` and resumes the flow per the derived card type.
 */
export const EnterBirthdateScreen = defineScreen({
  self: { ios: bcsc(v.enterBirthdate.birthdatePressable), android: bcsc(v.enterBirthdate.birthdateInput) },
  primary: bcsc(v.enterBirthdate.continue),
  back: bcsc(common.back),
  inputs: {
    birthdate: { ios: bcsc(v.enterBirthdate.birthdatePressable), android: bcsc(v.enterBirthdate.birthdateInput) },
  },
})

/**
 * `VerificationCardError` — the authorize-failure screen reached when `authorizeDevice` rejects the CSN/
 * birthdate at the EnterBirthdate submit (the unhandled-error path; a handled AppError would instead stay
 * on EnterBirthdate). This models the `MismatchedSerial` variant: `self`/`primary` (TryAnother) returns to
 * IdentitySelection. (The `CardExpired` variant shows `GetBCSC`, which opens an external browser.)
 */
export const VerificationCardErrorScreen = defineScreen({
  self: bcsc(v.verificationCardError.tryAnother),
  primary: bcsc(v.verificationCardError.tryAnother),
})

/**
 * Verification method selection (`'Verify Options'`) — reached after the id/email steps once the
 * device is authorized. Which of the three method buttons render is backend-driven and the title has
 * no testID, so `self` is the always-present HoursOfService heading. `primary` is In-Person (the CI
 * completion path); the header-left is a settings `menu`, not a back button.
 */
export const VerificationMethodSelectionScreen = defineScreen({
  self: bcsc(v.methodSelection.hoursOfService),
  primary: bcsc(v.methodSelection.inPerson),
  menu: bcsc(v.methodSelection.settingsMenu),
  links: {
    inPerson: bcsc(v.methodSelection.inPerson),
    sendVideo: bcsc(v.methodSelection.sendVideo),
    videoCall: bcsc(v.methodSelection.videoCall),
  },
})

/**
 * In-person verification (`'Verify In Person Instruction'`). `self`/`confirmationCode` is the
 * XXXX-XXXX code the approval helper reads off-screen; `primary` (Complete) → VerificationSuccess.
 * `secondary` (ServiceBCLink) opens an external URL (no in-stack nav).
 */
export const VerifyInPersonScreen = defineScreen({
  self: bcsc(v.verifyInPerson.confirmationCode),
  primary: bcsc(v.verifyInPerson.complete),
  secondary: bcsc(v.verifyInPerson.serviceBcLink),
  back: bcsc(common.back),
  elements: {
    confirmationCode: bcsc(v.verifyInPerson.confirmationCode),
  },
})

/**
 * Verification success (`'Setup Complete'`, no header). `primary` (Continue) exits the verify stack
 * to Home as a verified user; there is no back (header hidden, hardware-back disabled).
 */
export const VerificationSuccessScreen = defineScreen({
  self: bcsc(v.verificationSuccess.continue),
  primary: bcsc(v.verificationSuccess.continue),
})

/**
 * `EnterEmail` — appears after the authorize step ONLY when the card's authorize response carried no
 * verified email. `self`/`email` is the input (always present, iOS types the pressable wrapper);
 * `secondary` (SkipEmail) is offered on BCSC card flows only (hidden for non-BCSC). The photo journey
 * skips it; the combined journey fills a temp-inbox address here.
 */
export const EnterEmailScreen = defineScreen({
  self: { ios: bcsc(v.enterEmail.inputPressable), android: bcsc(v.enterEmail.input) },
  primary: bcsc(v.enterEmail.continue),
  secondary: bcsc(v.enterEmail.skip),
  back: bcsc(common.back),
  inputs: {
    email: { ios: bcsc(v.enterEmail.inputPressable), android: bcsc(v.enterEmail.input) },
  },
  elements: {
    // Presence marker for the conditional email step (see `reachVerificationMethod`): SkipEmail is the
    // stable, always-rendered control on this screen in the skippable BCSC flow — the input can lag.
    // Same testID as `secondary`; declared here so the flow can probe it via the descriptor.
    skip: bcsc(v.enterEmail.skip),
  },
})

/**
 * Selfie-photo instructions (`'Selfie Photo Tips'`) — the first screen of BOTH the send-video and the
 * live-call (open-hours) branches. `primary` (TakePhoto) enters the camera, which is out of CI, so
 * journeys browse in and `back` out.
 */
export const PhotoInstructionsScreen = defineScreen({
  self: bcsc(v.photoInstructions.takePhoto),
  primary: bcsc(v.photoInstructions.takePhoto),
  back: bcsc(common.back),
})

/**
 * Live-call busy/closed (`'Video Verify Closed'`) — the live-call branch when no agent queue is free
 * or it is outside service hours. `self` is the status title; `primary` (SendVideo) resets to method
 * selection, and `back` returns there too.
 */
export const CallBusyOrClosedScreen = defineScreen({
  self: bcsc(v.callBusyOrClosed.callStatusTitle),
  primary: bcsc(v.callBusyOrClosed.sendVideo),
  back: bcsc(common.back),
  elements: {
    callStatusTitle: bcsc(v.callBusyOrClosed.callStatusTitle),
    hoursOfServiceTitle: bcsc(v.callBusyOrClosed.hoursOfServiceTitle),
    reminderTitle: bcsc(v.callBusyOrClosed.reminderTitle),
  },
})

/**
 * Email confirmation (`'Email Verification'`) — enter the 6-digit code emailed to the address from
 * EnterEmail. `self`/`code` is the OTP field; `primary` (Continue) validates the code and RESETS the
 * stack to EmailVerified (a wrong code keeps the screen with an inline error).
 */
export const EmailConfirmationScreen = defineScreen({
  self: bcsc(v.emailConfirmation.codeInput),
  primary: bcsc(v.emailConfirmation.continue),
  back: bcsc(common.back),
  inputs: {
    code: bcsc(v.emailConfirmation.codeInput),
  },
})

/**
 * Email verified (`'Email Verified'`, no header) — the success interstitial after a correct code. Its
 * ONLY testID is the shared `Continue`, so callers confirm arrival by the title copy ("Your email has
 * been verified") before tapping `primary`, which RESETS to VerificationMethodSelection.
 */
export const EmailVerifiedScreen = defineScreen({
  self: bcsc(v.emailVerified.continue),
  primary: bcsc(v.emailVerified.continue),
})

/**
 * `AdditionalIdentificationRequired` ('Photo ID Required') — a non-photo BCSC card must add one extra
 * photo ID. Its only testID is the label-derived `Continue` CTA (so `self` defaults to `primary`);
 * confirm the screen by heading copy when arrival matters.
 */
export const AdditionalIdentificationRequiredScreen = defineScreen({
  primary: bcsc(v.additionalIdRequired.continue),
})

/**
 * `IDPhotoInformation` — the primer shown before the document camera; `primary` proceeds to
 * EvidenceCapture.
 */
export const IDPhotoInformationScreen = defineScreen({
  self: bcsc(v.idPhotoInformation.takePhoto),
  primary: bcsc(v.idPhotoInformation.takePhoto),
})

/**
 * `EvidenceCapture` — the MaskedCamera document capture (camera-only; on Sauce the image is injected,
 * else the physical camera is used). `self`/`primary` is the shutter, `secondary` the cancel/close.
 *
 * `maskedCamera` is the container, and it renders EARLIER than the shutter: the container appears once
 * the permission request settles, while the shutter waits on `useCameraDevice` resolving a device (until
 * then MaskedCamera shows a "no camera available" placeholder with no shutter). Probe the container to
 * tell "the push landed" apart from "the camera is still coming up" — anchoring only on the shutter
 * makes a slow camera and a swallowed tap produce the identical failure.
 */
export const EvidenceCaptureScreen = defineScreen({
  self: bcsc(v.evidenceCapture.takePhoto),
  primary: bcsc(v.evidenceCapture.takePhoto),
  secondary: bcsc(v.evidenceCapture.cancel),
  elements: {
    maskedCamera: bcsc(v.evidenceCapture.maskedCamera),
  },
})

/**
 * `PhotoReview` — accept or retake the captured document photo. `primary` (UsePhoto) proceeds to the
 * next side or the typed form; `secondary` (RetakePhoto) re-opens the camera.
 */
export const PhotoReviewScreen = defineScreen({
  self: bcsc(v.photoReview.usePhoto),
  primary: bcsc(v.photoReview.usePhoto),
  secondary: bcsc(v.photoReview.retake),
})

/**
 * `EvidenceIDCollection` — the TYPED document form after capture. `self`/`documentNumber` is the number
 * field (iOS types the pressable wrapper); `primary` (Continue) saves and resumes the flow. The
 * name/birthdate inputs render only for the first of two non-BCSC documents.
 */
export const EvidenceIDCollectionScreen = defineScreen({
  self: {
    ios: bcsc(v.evidenceIdCollection.documentNumberPressable),
    android: bcsc(v.evidenceIdCollection.documentNumberInput),
  },
  primary: bcsc(v.evidenceIdCollection.continue),
  back: bcsc(common.back),
  inputs: {
    documentNumber: {
      ios: bcsc(v.evidenceIdCollection.documentNumberPressable),
      android: bcsc(v.evidenceIdCollection.documentNumberInput),
    },
    lastName: bcsc(v.evidenceIdCollection.lastName),
    firstName: bcsc(v.evidenceIdCollection.firstName),
    middleNames: bcsc(v.evidenceIdCollection.middleNames),
    birthdate: bcsc(v.evidenceIdCollection.birthdate),
  },
})

/**
 * `DualIdentificationRequired` — the non-BCSC entry ("You must provide two government-issued IDs").
 * Its only CTA testID is the generic `Continue` (shared across screens), so callers confirm arrival by
 * heading before tapping `primary`. `seeAcceptedId` opens the accepted-documents webview.
 */
export const DualIdentificationRequiredScreen = defineScreen({
  primary: bcsc(v.dualIdRequired.continue),
  links: {
    seeAcceptedId: bcsc(v.dualIdRequired.seeAcceptedId),
  },
})

/**
 * `ResidentialAddress` ('Address Entry') — non-BCSC only, after both documents. Text inputs type into
 * the iOS pressable wrapper; `self`/`primary` is the submit button. `province` is a dropdown: tap
 * `province` (link) to open the modal, then `provinceBC`. No country field (hard-coded 'CA').
 */
export const ResidentialAddressScreen = defineScreen({
  self: bcsc(v.residentialAddress.continue),
  primary: bcsc(v.residentialAddress.continue),
  back: bcsc(common.back),
  inputs: {
    streetAddress1: {
      ios: bcsc(v.residentialAddress.streetAddress1Pressable),
      android: bcsc(v.residentialAddress.streetAddress1Input),
    },
    city: { ios: bcsc(v.residentialAddress.cityPressable), android: bcsc(v.residentialAddress.cityInput) },
    postalCode: {
      ios: bcsc(v.residentialAddress.postalCodePressable),
      android: bcsc(v.residentialAddress.postalCodeInput),
    },
  },
  links: {
    province: bcsc(v.residentialAddress.provinceInput),
    provinceBC: bcsc(v.residentialAddress.provinceOptionBC),
  },
})

/**
 * `TransferAccountInstructions` ('Transfer Instructions') — reached from AccountSetup `secondary`
 * (TransferAccount). Its visible title is only the nav-bar heading (a `Screens:` key, not
 * findByText-matchable), so anchor on the always-present `scanQrCode` primary button; return via `back`.
 */
export const TransferAccountInstructionsScreen = defineScreen({
  self: bcsc(v.transferInstructions.scanQrCode),
  back: bcsc(common.back),
})

/**
 * The in-app verify WebView (`VerifyWebView`, the shared `WebViewScreen`) — reached from the header
 * help menu's Learn More or `DualIdentificationRequired` `seeAcceptedId`. It renders no content
 * testIDs; pop it via the pushed screen's header `back` (mirrors `OnboardingWebViewScreen`).
 */
export const VerifyWebViewScreen = defineScreen({
  self: bcsc(common.back),
  back: bcsc(common.back),
})
