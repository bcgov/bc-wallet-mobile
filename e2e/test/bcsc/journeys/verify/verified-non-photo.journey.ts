import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  addAdditionalPhotoId,
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
 * Verified journey: non-photo card. A non-photo BC Services Card has no photo, so after the serial is
 * authorized the flow requires ONE additional photo ID (a passport here) — chosen from EvidenceTypeList,
 * PHOTOGRAPHED via the camera, then its number typed in EvidenceIDCollection. After that the email step
 * is skippable (BCSC flow) and completion is in-person.
 *
 * ⚠️ CAMERA-DEPENDENT — this journey cannot run camera-free. The document capture needs Sauce image
 * injection (`injectPhoto` throws off-Sauce; RN camera feeds are unreliable) or a physical camera on a
 * local real device. It is UNVALIDATED — first Sauce run must confirm: (1) injection actually feeds
 * EvidenceCapture, (2) the passport row's exact label 'Canadian Passport' (server-provided), (3) a
 * usable passport image (only dl_/id_ assets exist today).
 *
 * One ordered session: onboard → Continue → Scan serial → birthdate (authorizeDevice, non-photo) →
 * additional photo ID (pick → capture → typed number) → method selection → in-person → verified Home.
 */
describe('Verified journey: non-photo card', () => {
  before(() => {
    setTestUser(TestUsers.nonPhoto)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the non-photo serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('adds the required additional photo ID (passport) via capture + typed number', async () => {
    // Matches the EvidenceTypeList row whose testID contains 'Passport' (server-provided evidence_type).
    // If it throws listing the rows, pin the exact substring for daphne's document type (id 12).
    await addAdditionalPhotoId(getTestUser(), 'Passport')
  })

  it('resumes to the verification method selection after the document', async () => {
    // The email step is skippable for a BCSC card, so reachVerificationMethod skips it if shown.
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
