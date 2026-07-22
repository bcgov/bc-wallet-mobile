import type { TestUser } from '../constants.js'
import { Timeouts } from '../constants.js'
import { acceptSystemAlert } from '../helpers/alerts.js'
import { ApproveInPersonInput, approveInPersonRequest } from '../helpers/approval.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { HomeScreen } from '../screens/main.js'
import { VerifyPromptScreen } from '../screens/onboarding.js'
import {
  AccountSetupScreen,
  EnterBirthdateScreen,
  EnterEmailScreen,
  IdentitySelectionScreen,
  ManualSerialScreen,
  ScanSerialScreen,
  VerificationMethodSelectionScreen,
  VerificationSuccessScreen,
  VerifyInPersonScreen,
} from '../screens/verify.js'

/**
 * Verify-stack arranges — the entry spine only. `reachVerifyStep` and
 * `completeVerification(user, {method: 'in-person'})` land later with the verified card journeys,
 * which own the post-authorize screens.
 *
 * Reminder: the VerifyPrompt exists only in the session that completed onboarding — run
 * `completeOnboarding()` first and never relaunch in between.
 */

const engine = new BaseScreen()

/** VerifyPrompt `Continue` → the AccountSetup add-or-transfer choice. */
export async function startVerification(): Promise<void> {
  await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerifyPromptScreen.tap('primary')
  await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** AccountSetup `AddAccount` → IdentitySelection. */
export async function chooseAddAccount(): Promise<void> {
  await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await AccountSetupScreen.tap('primary')
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * The CI-default serial path — no live camera: IdentitySelection `Scan` → ScanSerial (accepting the
 * OS camera dialog when it appears; no-op when permission is already granted) → `EnterManually` →
 * ManualSerial → serial typed → EnterBirthdate. Card type is derived later, by `authorizeDevice`
 * at the birthdate submit.
 */
export async function enterSerialManually(user: TestUser): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tap('primary')
  await acceptSystemAlert()
  await ScanSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ScanSerialScreen.tap('primary')
  await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ManualSerialScreen.fill('serial', user.cardSerial, { tapFirst: true })
  await engine.dismissKeyboard()
  await ManualSerialScreen.tapWhenEnabled('primary')
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Fill and SUBMIT the birthdate — the submit fires the backend `authorizeDevice(serial, dob)` that
 * derives the card type and resumes the flow. Callers assert the post-authorize screen themselves
 * (it differs per card type). For a no-network fill (e.g. the entry-spine journey), use
 * `EnterBirthdateScreen.fill(...)` directly instead.
 */
export async function enterBirthdate(user: TestUser): Promise<void> {
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterBirthdateScreen.fill('birthdate', user.dob, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterBirthdateScreen.tapWhenEnabled('primary')
}

/**
 * Build the SiteMinder in-person approval payload from a TestUser's flow — card-tap flows pass the
 * serial + birthdate, document flows pass the typed document number(s). Mirrors the per-flow inputs
 * `approveInPersonRequest` expects.
 */
function approvalInputForUser(user: TestUser): ApproveInPersonInput {
  if (user.flow === 'non-bcsc') {
    return {
      flow: 'non-bcsc',
      documents: [
        { typeId: user.primaryDocumentTypeId, number: user.primaryDocumentNumber },
        { typeId: user.documentTypeId, number: user.documentNumber },
      ],
    }
  }
  if (user.flow === 'non-photo') {
    return {
      flow: 'non-photo',
      cardSerialNumber: user.cardSerial,
      cardBirthdate: user.dob,
      document: { typeId: user.documentTypeId, number: user.documentNumber },
    }
  }
  return { flow: 'photo', cardSerialNumber: user.cardSerial, cardBirthdate: user.dob }
}

/**
 * From the post-authorize state (birthdate submitted), reach VerificationMethodSelection. For a
 * card-tap flow the address step is auto-satisfied once the device is authorized; the email step
 * only appears when the card supplied no verified email. Poll for whichever screen resumes and skip
 * the optional email so the arrange lands deterministically on method selection.
 */
export async function reachVerificationMethod(): Promise<void> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  for (;;) {
    if (await VerificationMethodSelectionScreen.isPresent(1_000)) {
      return
    }
    if (await EnterEmailScreen.isPresent(1_000)) {
      await EnterEmailScreen.tap('secondary') // SkipEmail
      await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      return
    }
    if (Date.now() > deadline) {
      throw new Error('After authorizeDevice, neither VerificationMethodSelection nor EnterEmail appeared')
    }
  }
}

/**
 * Complete verification via the IN-PERSON method — the CI default: no in-app camera, approved by the
 * real SiteMinder/IDcheck SIT flow (`approveInPersonRequest`; needs `SM_USER`/`SM_PASSWORD` and an
 * allowlisted runner IP). Assumes VerificationMethodSelection is showing. Reads the on-screen
 * confirmation code, drives the approval, then Complete → VerificationSuccess → Home (verified).
 *
 * Only `in-person` is CI-completable; the send-video / live-call methods enter camera screens and
 * live in the manual suite.
 */
export async function completeVerification(
  user: TestUser,
  options: { method: 'in-person' | 'send-video' | 'live-call' }
): Promise<void> {
  if (options.method !== 'in-person') {
    throw new Error(`completeVerification: only 'in-person' is CI-completable (got '${options.method}')`)
  }

  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('inPerson')

  await VerifyInPersonScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const confirmationCode = await VerifyInPersonScreen.read('confirmationCode')
  await approveInPersonRequest(confirmationCode, approvalInputForUser(user))

  await VerifyInPersonScreen.tapWhenEnabled('primary') // Complete
  await VerificationSuccessScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationSuccessScreen.tap('primary') // Continue → exits verify stack to Home

  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}
