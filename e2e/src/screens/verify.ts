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
