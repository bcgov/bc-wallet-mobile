import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  captureAdditionalPhotoId,
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  reachAdditionalPhotoIdList,
  reachVerificationMethod,
  resumeVerification,
  startVerification,
  submitEvidenceIdCollection,
} from '../../../src/flows/verify.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import {
  EvidenceIDCollectionScreen,
  EvidenceTypeListScreen,
  VerificationMethodSelectionScreen,
} from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** Engine handle for the one screen anchored on visible copy (EvidenceTypeList has no container testID). */
const engine = new BaseScreen()

/** `BCSC.EvidenceTypeList.OtherIDOptionsHeading` — proves the list swapped to the non-photo filter. */
const OTHER_ID_OPTIONS_HEADING = 'Other ID options'

/**
 * Verified journey: non-photo card. A non-photo BC Services Card has no photo, so after the serial is
 * authorized the flow requires ONE additional photo ID (a passport here) — chosen from EvidenceTypeList,
 * PHOTOGRAPHED via the camera, then its number typed in EvidenceIDCollection. After that the email step
 * is skippable (BCSC flow) and completion is in-person.
 *
 * CAMERA-DEPENDENT — the document capture uses Sauce image injection (`injectPhoto` throws off-Sauce)
 * or a physical camera; validated on Sauce.
 *
 * This is the only journey whose evidence list is photo-FILTERED, so it also carries the branch-sweep
 * riders that live there: the "Show more options" escape hatch (which exists only on this path),
 * PhotoReview's Retake, and the resume step for a document captured but not yet numbered — the one
 * mid-capture state that survives a relaunch, so it is asserted across one.
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

  it('browses the non-photo ID options and returns to the photo list', async () => {
    await reachAdditionalPhotoIdList()
    // The escape hatch renders ONLY here — photo-filtered list, nothing collected yet — and is how a
    // user without any photo ID proceeds. It REPLACES the list rather than pushing, so there is no
    // back to the photo list: the way out is back to the primer and in again.
    await EvidenceTypeListScreen.waitFor('otherOptions', Timeouts.SCREEN_TRANSITION)
    await EvidenceTypeListScreen.link('otherOptions')
    await engine.waitForText(OTHER_ID_OPTIONS_HEADING, Timeouts.SCREEN_TRANSITION)
    await EvidenceTypeListScreen.back.tap()
    await reachAdditionalPhotoIdList()
  })

  it('captures the passport, retaking the first photo before accepting it', async () => {
    // Retake discards the shot and returns to the camera for the SAME side; the resulting evidence is
    // identical, so what this proves is that the discard-and-return path works at all.
    await captureAdditionalPhotoId(getTestUser(), 'Passport', { retakeFirstSide: true })
    await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resumes onto the document-number form after a relaunch', async () => {
    // A document with all its photos but no number is the ONE mid-capture state hydration preserves
    // (an evidence with no photos at all is dropped as abandoned), so the captured photos must survive
    // the relaunch and the app must resume here rather than at the start of the ID step.
    await unlockWithPin(TEST_PIN, { relaunch: true })
    await resumeVerification()
    await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('types the captured document number', async () => {
    await submitEvidenceIdCollection(getTestUser().documentNumber)
  })

  it('resumes to the verification method selection after the document', async () => {
    // The email step is skippable for a BCSC card, so reachVerificationMethod skips it if shown.
    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser())
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
