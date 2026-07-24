import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  reachVerificationMethod,
  startVerification,
} from '../../../../src/flows/verify.js'
import { HomeScreen, SettingsScreen } from '../../../../src/screens/main.js'
import {
  CallBusyOrClosedScreen,
  PhotoInstructionsScreen,
  VerificationMethodSelectionScreen,
} from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Verified journey: photo card — the lightest verified path (serial + dob only), so it is the first
 * verified journey proven end-to-end and the template for the other card types.
 *
 * One ordered session: onboard (same session — VerifyPrompt exists only here) → Continue → manual
 * serial → birthdate submit (`authorizeDevice` derives the photo card) → method selection. It browses
 * the send-video and live-call method detours WITHOUT entering the camera, then completes IN-PERSON —
 * the CI method, approved by the real SiteMinder/IDcheck flow (`approveInPersonRequest`; needs
 * `SM_USER`/`SM_PASSWORD` on an allowlisted runner) — reaching VerificationSuccess and verified Home.
 *
 * mocha bail makes the checkpoints fail-fast within this file only; every other journey still runs.
 */
describe('Verified journey: photo card', () => {
  before(() => {
    setTestUser(TestUsers.photo)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the photo serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('resumes to the verification method selection after authorizing', async () => {
    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('browses the send-video detour and backs out before the camera', async () => {
    await VerificationMethodSelectionScreen.link('sendVideo')
    // Send-video routes through the selfie-photo step first; stop before the camera.
    await PhotoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await PhotoInstructionsScreen.back.tap()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('browses the live-call detour (busy/closed or open) and backs out — passes day or night', async () => {
    await VerificationMethodSelectionScreen.link('videoCall')
    // Live-call branches on agent-queue availability and service hours: either the CallBusyOrClosed
    // status screen or (open) the shared PhotoInstructions. Handle both so this passes at any hour.
    if (await CallBusyOrClosedScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      await CallBusyOrClosedScreen.back.tap()
    } else {
      await PhotoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      await PhotoInstructionsScreen.back.tap()
    }
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser(), { method: 'in-person' })
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('confirms verified state: the account profile row now appears in Settings', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The Profile row (→ AccountDetails) is verified-gated — the unverified journey asserts it absent;
    // here it must be present, proving the account flipped to verified.
    assert.ok(
      await SettingsScreen.isVisible('profile'),
      'the Settings Profile row is verified-gated and should be visible after verification'
    )
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
