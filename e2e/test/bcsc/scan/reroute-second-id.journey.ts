import assert from 'node:assert/strict'
import { TestUsers } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  captureFirstNonBcscDocument,
  chooseAddAccount,
  listEvidenceTypeRowIds,
  presentBcscCardAsEvidence,
  selectEvidenceType,
  startVerification,
  submitEvidenceIdCollection,
} from '../../../src/flows/verify.js'
import { canInjectCardBarcodes } from '../../../src/helpers/camera.js'
import { getNonBcscTestUser, setTestUser } from '../../../src/support/context.js'
import { FIRST_DOC_MATCH, expectRerouteToMethodSelection } from './reroute-context.js'

/** The second slot's ID. The licence used for the first is filtered out of this list. */
const SECOND_DOC_MATCH = 'Canadian Passport'

/**
 * Scan journey: the reroute fires on the SECOND non-BCSC ID, not just the first.
 *
 * The user completes one genuine document, then photographs a real BC Services Card for the second —
 * the "re-route to BCSC on second ID" row. The mechanism is identical to the first-ID journeys; what
 * this run proves is that the check is still armed after a document has been banked, and that the
 * landing moves with the state that document created.
 *
 * A NON-PHOTO card is used deliberately: on the first ID it lands back inside the ID step (no photo
 * document on file yet), but here the completed licence IS that photo document — so the same card
 * type now finishes the ID step and lands at the method choice instead. The pair of journeys is what
 * demonstrates the rule; either alone looks like an arbitrary destination.
 *
 * ANDROID + SAUCE ONLY, one-way per session — see the photo-card journey for why.
 */
describe('Scan journey: non-BCSC reroutes on the second ID', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
    setTestUser(TestUsers.na)
  })

  it('captures and banks a genuine first document', async () => {
    await completeOnboarding()
    await startVerification()
    await chooseAddAccount()
    // Masked, so this one does NOT reroute: the shared card-back template carries a real SIT combo
    // barcode, and the whole point here is to bank an ordinary document first.
    await captureFirstNonBcscDocument(getNonBcscTestUser(), FIRST_DOC_MATCH)
    const user = getNonBcscTestUser()
    await submitEvidenceIdCollection(user.primaryDocumentNumber, {
      lastName: user.lastName,
      firstName: user.firstName,
      dob: user.dob,
    })
    // The second slot's list, asserted by its rows — NOT EvidenceTypeListScreen, whose anchor is the
    // `otherOptions` row that stops rendering as soon as any evidence is banked.
    const rows = await listEvidenceTypeRowIds()
    assert.ok(
      rows.some((id) => id.toLowerCase().includes(SECOND_DOC_MATCH.toLowerCase())),
      `"${SECOND_DOC_MATCH}" should be offered for the second ID. Rows: ${JSON.stringify(rows)}`
    )
  })

  it('reroutes to the method choice when the second ID is a real BC Services Card', async () => {
    await selectEvidenceType(SECOND_DOC_MATCH)
    await presentBcscCardAsEvidence(TestUsers.nonPhoto.cardScanTarget)
    // The banked licence satisfies the non-photo card's photo-ID requirement, so unlike the first-ID
    // journey this closes the ID step outright.
    await expectRerouteToMethodSelection()
  })
})
