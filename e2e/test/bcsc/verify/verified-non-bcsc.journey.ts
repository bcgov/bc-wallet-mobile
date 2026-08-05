import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  captureFirstNonBcscDocument,
  captureSecondNonBcscDocument,
  chooseAddAccount,
  completeEmailVerification,
  completeVerification,
  fillResidentialAddress,
  leaveVerificationToHome,
  listEvidenceTypeRowIds,
  resendEmailCode,
  resumeVerification,
  startEmailVerification,
  startVerification,
  submitEmailCode,
  submitEvidenceIdCollection,
} from '../../../src/flows/verify.js'
import { tapAlertButton } from '../../../src/helpers/alerts.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import {
  EmailConfirmationScreen,
  EnterEmailScreen,
  EvidenceIDCollectionScreen,
  ResidentialAddressScreen,
  VerificationMethodSelectionScreen,
} from '../../../src/screens/verify.js'
import { getNonBcscTestUser, getTestUser, setTestUser } from '../../../src/support/context.js'

/** The two documents, in slot order. Case-insensitive substrings of the server-keyed row testIDs. */
const FIRST_DOC_MATCH = 'BC Drivers Licence'
const SECOND_DOC_MATCH = 'Canadian Passport'

/** Under the app's 12-year minimum until 2032, and a valid past date — so it fails ONLY the age rule. */
const UNDER_AGE_DOB = '20200101'
/** `BCSC.EvidenceIDCollection.BirthDateAgeError` with `MINIMUM_VERIFICATION_AGE` interpolated. */
const UNDER_AGE_ERROR = 'You must be 12 years or older to set up a mobile card'

/** Six digits, so the server (not the client-side length rule) is what rejects it. */
const WRONG_EMAIL_CODE = '000000'
/** `BCSC.EmailConfirmation.CodeDoesNotMatch` — shown inline AND in an alert on the 404. */
const CODE_DOES_NOT_MATCH = 'The code you entered does not match. Try again.'
/** The 404 alert's only action (`Global.OK`). */
const EMAIL_ALERT_OK = 'OK'

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
 * Being the only journey that reaches them, it also carries the riders that need this state: the under-12
 * birthdate rejection, the second slot's filtered ID list, the wrong-code/resend email detours, and the
 * two resume steps (address, email) that cost two captured documents.
 *
 * Ordered session: onboard → OtherID → two documents → residential address → email (temp inbox) →
 * method selection → in-person → verified Home
 */
describe('Verified journey: non-bcsc card', () => {
  before(() => {
    setTestUser(TestUsers.na)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('captures the first ID and rejects an under-12 birthdate on its form', async () => {
    await startVerification()
    await chooseAddAccount()
    await captureFirstNonBcscDocument(getTestUser(), FIRST_DOC_MATCH)

    // The age rule is client-side and lives ONLY here — there is no under-12 card process. Submit an
    // under-age date, then the real one; the form re-types every field, so the second submit is clean.
    const user = getNonBcscTestUser()
    const personalInfo = { lastName: user.lastName, firstName: user.firstName, dob: UNDER_AGE_DOB }
    await submitEvidenceIdCollection(user.primaryDocumentNumber, personalInfo)
    // This node doubles as the field's static hint, so assert its TEXT, not its presence.
    await EvidenceIDCollectionScreen.waitFor('birthdateSubtext', Timeouts.SCREEN_TRANSITION)
    assert.equal(await EvidenceIDCollectionScreen.read('birthdateSubtext'), UNDER_AGE_ERROR)

    await submitEvidenceIdCollection(user.primaryDocumentNumber, { ...personalInfo, dob: user.dob })
  })

  it('offers a different ID list for the second slot, without the one already used', async () => {
    // The list filters by `collection_order` and hides what is already chosen, so the second slot must
    // not offer the licence just collected.
    const rows = await listEvidenceTypeRowIds()
    assert.ok(
      !rows.some((id) => id.toLowerCase().includes(FIRST_DOC_MATCH.toLowerCase())),
      `"${FIRST_DOC_MATCH}" is already collected and should not be selectable again. Rows: ${JSON.stringify(rows)}`
    )
    assert.ok(
      rows.some((id) => id.toLowerCase().includes(SECOND_DOC_MATCH.toLowerCase())),
      `"${SECOND_DOC_MATCH}" should be offered for the second ID. Rows: ${JSON.stringify(rows)}`
    )
  })

  it('captures the second ID and reaches the address step', async () => {
    await captureSecondNonBcscDocument(getTestUser(), SECOND_DOC_MATCH)
    await submitEvidenceIdCollection(getTestUser().documentNumber)
    await ResidentialAddressScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resumes onto the address step after leaving verification', async () => {
    // Both documents are complete but the device is not yet authorized, so address is the owed step.
    await leaveVerificationToHome()
    await resumeVerification()
    await ResidentialAddressScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('fills the residential address', async () => {
    await fillResidentialAddress()
  })

  it('resumes onto the email step after leaving verification', async () => {
    // The address submit authorizes the device, which moves the owed step from address to email.
    await leaveVerificationToHome()
    await resumeVerification()
    await EnterEmailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('rejects a wrong email code, then verifies with a resent one', async () => {
    const token = await startEmailVerification()

    // Six digits, so this is the SERVER's 404 rather than the client-side length rule: it renders the
    // message inline and raises an alert carrying the same copy.
    await submitEmailCode(WRONG_EMAIL_CODE)
    await tapAlertButton(EMAIL_ALERT_OK)
    await EmailConfirmationScreen.waitFor('codeError', Timeouts.SCREEN_TRANSITION)
    assert.equal(await EmailConfirmationScreen.read('codeError'), CODE_DOES_NOT_MATCH)

    // The resend retires the code already sent, so only the new one can work — and that it arrives at
    // all is the resend's assertion.
    await submitEmailCode(await resendEmailCode(token))
    await completeEmailVerification()
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
