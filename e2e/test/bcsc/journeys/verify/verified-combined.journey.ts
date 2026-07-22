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
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Verified journey: combined card. A combined card uses the same BCSC-photo authorize process as the
 * photo card and its authorize response carries a verified email, so it resumes straight to method
 * selection with NO email step — the flow is the same as the photo journey, just a different card.
 * (The mandatory email step lives in the non-bcsc journey, where Skip is hidden.)
 *
 * One ordered session: onboard (same session — VerifyPrompt exists only here) → Continue → manual
 * serial → birthdate (authorizeDevice) → method selection → in-person approval → VerificationSuccess
 * → verified Home.
 *
 * Its distinct coverage — Contacts + verified AccountDetails — is appended here when MAIN-4 lands.
 * mocha bail isolates any failure to this file; the other journeys still run.
 */
describe('Verified journey: combined card', () => {
  before(() => {
    setTestUser(TestUsers.combined)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the combined serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('resumes to the verification method selection after authorizing', async () => {
    // Combined carries a card-provided email, so the flow skips EnterEmail and lands on method
    // selection directly (reachVerificationMethod tolerates either).
    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser(), { method: 'in-person' })
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('confirms verified state: the account profile row now appears in Settings', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(
      await SettingsScreen.isVisible('profile'),
      'the Settings Profile row is verified-gated and should be visible after verification'
    )
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
