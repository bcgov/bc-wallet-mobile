import type { TestUser } from '../constants.js'
import { COMBO_CARD_BARCODE_MASKS, Timeouts } from '../constants.js'
import { tapAlertButton } from '../helpers/alerts.js'
import { approveInPersonRequest } from '../helpers/approval.js'
import { BaseScreen, bcsc, defineScreen } from '../screens/core/index.js'
import { TabBar } from '../screens/main.js'
import { ManualSerialScreen, VerifyInPersonScreen } from '../screens/verify.js'
import { TestIds } from '../test-ids/registry.js'
import { SetupStepsV403Screen } from './onboarding-v403.js'
import { approvalInputForUser, capturePhotoIdDocument, selectEvidenceType } from './verify.js'

/**
 * Verify walk for the 4.0.3 release binary — the half of the frozen 4.0.3 flow after
 * `onboarding-v403.ts`. 4.0.3 enters verification from the Setup Steps rows (no VerifyPrompt /
 * AccountSetup) and every step resets back to that list, so each arrange below starts and ends there.
 * Screens whose ids survived the rework (ManualSerial, VerifyInPerson, the evidence screens) reuse
 * today's objects; the rest are frozen copies of 4.0.3's values. Retire with `onboarding-v403.ts`.
 */

const engine = new BaseScreen()
const v = TestIds.verify
const m = TestIds.main

/** Copy of EnterEmail's skip-confirmation button — no testID, same as today. */
const EMAIL_SKIP_CONFIRM = 'Skip'

// ── Frozen 4.0.3 screens ──

/** Step 1 — the nickname form, same ids as today's edit-nickname form; Save resets to Setup Steps. */
const NicknameAccountV403Screen = defineScreen({
  self: { ios: bcsc(m.editNickname.pressable), android: bcsc(m.editNickname.input) },
  primary: bcsc(m.editNickname.save),
  inputs: {
    nickname: { ios: bcsc(m.editNickname.pressable), android: bcsc(m.editNickname.input) },
  },
})

/** Step 2's card-type tiles (today a single Scan button); every BCSC tile leads to SerialInstructions. */
const IdentitySelectionV403Screen = defineScreen({
  self: bcsc('PhotoCard'),
  secondary: bcsc(v.identitySelection.otherId),
  links: {
    combinedCard: bcsc('CombinedCard'),
    photoCard: bcsc('PhotoCard'),
    noPhotoCard: bcsc('NoPhotoCard'),
  },
})

/** The scan-or-type primer 4.0.3 put before the serial; gone from today's path. */
const SerialInstructionsV403Screen = defineScreen({
  self: bcsc('EnterManually'),
  primary: bcsc('EnterManually'),
})

/** Same inputs as today; the submit was `Done`, and it resets to Setup Steps rather than moving on. */
const EnterBirthdateV403Screen = defineScreen({
  self: { ios: bcsc(v.enterBirthdate.birthdatePressable), android: bcsc(v.enterBirthdate.birthdateInput) },
  primary: bcsc('Done'),
  inputs: {
    birthdate: { ios: bcsc(v.enterBirthdate.birthdatePressable), android: bcsc(v.enterBirthdate.birthdateInput) },
  },
})

/** Step 4 — 4.0.3's email buttons carry RAW (unprefixed) ids; only the BCSC skip is driven here. */
const EnterEmailV403Screen = defineScreen({
  self: 'SkipButton',
  secondary: 'SkipButton',
})

/** Method buttons are their titles on 4.0.3, and there is no hours-of-service heading to anchor on. */
const VerificationMethodSelectionV403Screen = defineScreen({
  self: bcsc('In person'),
  links: {
    inPerson: bcsc('In person'),
    sendVideo: bcsc('Send a video'),
    videoCall: bcsc('Video call'),
  },
})

/** `Ok` is shared with SuccessfullySent and PendingReview on 4.0.3 — only asserted right after Complete. */
const VerificationSuccessV403Screen = defineScreen({
  self: bcsc('Ok'),
  primary: bcsc('Ok'),
})

/** The non-BCSC entry; its CTA is the label-derived `Choose ID` (today: the generic Continue). */
const DualIdentificationRequiredV403Screen = defineScreen({
  self: bcsc('Choose ID'),
  primary: bcsc('Choose ID'),
})

// ── Arranges ──

/** Step 1: save the account nickname — the rows after it stay disabled until this is done. */
export async function completeNicknameStepV403(nickname: string): Promise<void> {
  await SetupStepsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SetupStepsV403Screen.link('step1')
  await NicknameAccountV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await NicknameAccountV403Screen.fill('nickname', nickname, { tapFirst: true })
  await engine.dismissKeyboard()
  await NicknameAccountV403Screen.tapWhenEnabled('primary') // SaveAndContinue → resets to Setup Steps
  await SetupStepsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** Step 2 up to the birthdate: photo-card tile → EnterManually → serial typed → stop ON EnterBirthdate. */
export async function enterSerialV403(user: TestUser): Promise<void> {
  await SetupStepsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SetupStepsV403Screen.link('step2')
  await IdentitySelectionV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionV403Screen.link('photoCard')
  await SerialInstructionsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SerialInstructionsV403Screen.tapToReach('primary', ManualSerialScreen)
  await ManualSerialScreen.fill('serial', user.cardSerial, { tapFirst: true })
  await engine.dismissKeyboard()
  await ManualSerialScreen.tapWhenEnabled('primary') // persists the serial, then EnterBirthdate
  await EnterBirthdateV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** Serial + birthdate submitted (`Done` → authorizeDevice → Setup Steps), then Step 5 → method selection. */
export async function authorizeV403(user: TestUser): Promise<void> {
  await enterSerialV403(user)
  await EnterBirthdateV403Screen.fill('birthdate', user.dob, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterBirthdateV403Screen.tapWhenEnabled('primary')
  await SetupStepsV403Screen.expectVisible(Timeouts.APP_LAUNCH)
  await ensureEmailStepV403()
  await SetupStepsV403Screen.link('step5')
  await VerificationMethodSelectionV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Step 4 completes by itself when the authorize response carries the card's verified email (every SIT
 * BCSC card does); otherwise Step 5 stays disabled, so skip the email the way a BCSC card may.
 */
async function ensureEmailStepV403(): Promise<void> {
  await SetupStepsV403Screen.waitFor('step5', Timeouts.SCREEN_TRANSITION) // scrolls the row into view first
  const step5 = await engine.findByTestId(bcsc('Step 5'))
  if (await step5.isEnabled()) return
  await SetupStepsV403Screen.link('step4')
  await EnterEmailV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterEmailV403Screen.tap('secondary') // SkipButton → confirmation alert
  await tapAlertButton(EMAIL_SKIP_CONFIRM)
  await SetupStepsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** Method selection → In person → the XXXX-XXXX code, read off VerifyInPerson and NOT approved. */
export async function showInPersonCodeV403(): Promise<string> {
  await VerificationMethodSelectionV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionV403Screen.link('inPerson')
  await VerifyInPersonScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  return VerifyInPersonScreen.read('confirmationCode')
}

/** Approve the displayed code in IDCheck, Complete → `Ok` → 4.0.3's verified Home (tab bar; no scan FAB yet). */
export async function approveAndCompleteV403(user: TestUser, code: string): Promise<void> {
  await approveInPersonRequest(code, approvalInputForUser(user))
  await VerifyInPersonScreen.tapWhenEnabled('primary') // Complete
  await VerificationSuccessV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationSuccessV403Screen.tap('primary')
  await TabBar.expectVisible(Timeouts.APP_LAUNCH)
}

/** Step 2 → OtherID → `Choose ID` → the first document photographed → stop ON its number form. */
export async function captureFirstDocumentOnlyV403(user: TestUser, docMatch: string): Promise<void> {
  await SetupStepsV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await SetupStepsV403Screen.link('step2')
  await IdentitySelectionV403Screen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionV403Screen.tapToReach('secondary', DualIdentificationRequiredV403Screen)
  await DualIdentificationRequiredV403Screen.tapToNavigate('primary') // Choose ID → EvidenceTypeList
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS)
}
