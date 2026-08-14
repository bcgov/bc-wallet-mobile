import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  captureFirstNonBcscDocument,
  captureSecondNonBcscDocument,
  chooseAddAccount,
  completeEmailVerification,
  fillResidentialAddress,
  startEmailVerification,
  startVerification,
  submitEmailCode,
  submitEvidenceIdCollection,
  submitSendVideoVerification,
  waitForSendVideoDecision,
} from '../../../src/flows/verify.js'
import { reviewSendVideoRequest } from '../../../src/helpers/approval.js'
import { getEmailConfirmationCode } from '../../../src/helpers/email.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import { VerificationSuccessScreen } from '../../../src/screens/verify.js'
import { getNonBcscTestUser, getTestUser, setTestUser } from '../../../src/support/context.js'

/** The two documents, in slot order. Case-insensitive substrings of the server-keyed row testIDs. */
const FIRST_DOC_MATCH = 'BC Drivers Licence'
const SECOND_DOC_MATCH = 'Canadian Passport'

/**
 * Verified journey: non-BCSC via send video — the longest path in the suite, and the only one whose
 * agent decision is not a straight approve.
 *
 * A cardless registration is reviewed through a different queue than a cardholder's, and the portal asks
 * the reviewer which existing identity this person is before it will accept anything. That match step is
 * what this journey is for; the recording itself is shared with every other send-video journey.
 *
 * The persona re-registers on every run, so the match list is full of its own prior records — which is
 * why the script picks by name rather than taking the first candidate offered.
 *
 * CAMERA-DEPENDENT (two documents plus the selfie, all injected) and INBOX-DEPENDENT: the email step is
 * mandatory for a cardless registration, so this cannot run on a network that intercepts the disposable
 * -inbox providers — see the non-BCSC in-person journey's note.
 *
 * QUEUE HYGIENE: reviews claim the NEXT queued request blindly, so no other send-video journey may run
 * CONCURRENTLY (the suite is serial at the default `maxInstances: 1`).
 */
describe('Verified journey: non-bcsc, send video', () => {
  before(() => {
    setTestUser(TestUsers.na)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('captures both identity documents', async () => {
    const user = getNonBcscTestUser()
    await startVerification()
    await chooseAddAccount()

    await captureFirstNonBcscDocument(getTestUser(), FIRST_DOC_MATCH)
    // The first slot also collects the name and birthdate the agent later confirms.
    await submitEvidenceIdCollection(user.primaryDocumentNumber, {
      lastName: user.lastName,
      firstName: user.firstName,
      dob: user.dob,
    })

    await captureSecondNonBcscDocument(getTestUser(), SECOND_DOC_MATCH)
    await submitEvidenceIdCollection(user.documentNumber)
  })

  it('fills the address and verifies an email, reaching the method selection', async () => {
    await fillResidentialAddress()
    // Mandatory here — a cardless registration has no card-supplied email and no Skip.
    const token = await startEmailVerification()
    await submitEmailCode(await getEmailConfirmationCode(token))
    await completeEmailVerification()
  })

  it('records and uploads a send-video request', async () => {
    await submitSendVideoVerification(getTestUser())
  })

  it('is matched to an existing identity and approved (scripted against the SIT review portal)', async () => {
    const user = getTestUser()
    // Serial is 'N/A' for every cardless request, so the name is what identifies this one — and it also
    // chooses the identity the portal matches against.
    await reviewSendVideoRequest({
      decision: 'approve',
      cardSerialNumber: user.cardSerial,
      surname: user.lastName,
      firstName: user.firstName,
    })
  })

  it('picks up the approval and lands on verified Home', async () => {
    await waitForSendVideoDecision('verified')
    await VerificationSuccessScreen.tap('primary') // Continue → exits the verify stack to Home
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
