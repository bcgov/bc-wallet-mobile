import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  collectNonBcscEvidence,
  completeVerification,
  fillResidentialAddress,
  startVerification,
  verifyEmailWithTempInbox,
} from '../../../../src/flows/verify.js'
import { HomeScreen, SettingsScreen } from '../../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Verified journey: non-BCSC card — the heaviest path. The user has no BC Services Card, so instead of
 * a serial they provide TWO government IDs via `OtherID` → `DualIdentificationRequired` (each captured
 * by camera, then typed; the first also collects name + birthdate), then a residential address, then
 * the MANDATORY email step (no Skip on non-BCSC), and finally complete in person.
 *
 * CAMERA-DEPENDENT — document capture uses Sauce image injection (or a physical camera). Validated on
 * Sauce: the per-slot EvidenceTypeList row substrings ('BC Drivers Licence' / 'Canadian Passport';
 * selectEvidenceType lists the real ones on a miss), the ResidentialAddress province dropdown
 * (`province-option-BC`), and the mandatory email step all resolve.
 *
 * Ordered session: onboard → OtherID → two documents → residential address → email (temp inbox) →
 * method selection → in-person → verified Home.
 */
describe('Verified journey: non-bcsc card', () => {
  before(() => {
    setTestUser(TestUsers.na)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('chooses Other ID and provides two government documents', async () => {
    await startVerification()
    await chooseAddAccount()
    // The options DIFFER per slot: the first document's list offers 'BC Drivers Licence', the second
    // uses 'Canadian Drivers Licence'. Each substring must uniquely match its slot's list and map to
    // fred's document types (18 / 12) for the SM approval — so the specific document matters.
    await collectNonBcscEvidence(getTestUser(), 'BC Drivers Licence', 'Canadian Passport')
  })

  it('fills the residential address', async () => {
    await fillResidentialAddress()
  })

  it('verifies the mandatory email via a temporary inbox', async () => {
    await verifyEmailWithTempInbox()
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
