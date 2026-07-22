import type { TestUser } from '../constants.js'
import { Timeouts } from '../constants.js'
import { acceptSystemAlert } from '../helpers/alerts.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { VerifyPromptScreen } from '../screens/onboarding.js'
import {
  AccountSetupScreen,
  EnterBirthdateScreen,
  IdentitySelectionScreen,
  ManualSerialScreen,
  ScanSerialScreen,
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
