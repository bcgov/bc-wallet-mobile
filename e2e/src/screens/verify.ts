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
 * Camera scan screen (`ScanSerial`). Mount auto-requests camera permission — the OS dialog appears
 * on first entry (`acceptSystemAlert`); while the request is pending the screen is a loading view,
 * and when denied it renders the PermissionDisabled fallback (no testID — title copy only).
 * `primary` (EnterManually) is the CI path around the live camera.
 */
export const ScanSerialScreen = defineScreen({
  self: bcsc(v.scanSerial.enterManually),
  primary: bcsc(v.scanSerial.enterManually),
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
 * `EnterEmail` — appears after the authorize step ONLY when the card provided no verified email; a
 * photo card that already carries one resumes straight to method selection. `self`/`secondary`
 * (SkipEmail) is unique to this screen, so journeys can detect and skip it.
 */
export const EnterEmailScreen = defineScreen({
  self: bcsc(v.enterEmail.skip),
  primary: bcsc(v.enterEmail.continue),
  secondary: bcsc(v.enterEmail.skip),
  back: bcsc(common.back),
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
