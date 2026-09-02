import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  captureAdditionalPhotoId,
  chooseAddAccount,
  cleanUpQueuedSubmission,
  clearReviewQueueBeforeSubmit,
  enterBirthdate,
  enterSerialManually,
  reachAdditionalPhotoIdList,
  reachVerificationMethod,
  startVerification,
  submitEvidenceIdCollection,
  submitSendVideoVerification,
  waitForSendVideoDecision,
} from '../../../src/flows/verify.js'
import { type ClaimedRequestSummary, reviewSendVideoRequest } from '../../../src/helpers/approval.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import { VerificationSuccessScreen } from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** The additional photo ID this card type must add, as a substring of the server-keyed row testID. */
const ADDITIONAL_ID_MATCH = 'Passport'

/**
 * Verified journey: non-photo card via send video. Same submission and agent decision as the photo
 * journey, from the card type that has to add a photo ID first — so the upload carries that document
 * alongside the selfie and video, and the agent's review form grows the fields for confirming it.
 *
 * That extra document is the whole reason this journey exists; everything about the recording itself is
 * shared. The riders that live on this card type (the "other ID options" list, PhotoReview's Retake, the
 * awaiting-number resume) stay on the in-person journey rather than being paid for twice.
 *
 * CAMERA-DEPENDENT — both the document and the selfie use Sauce image injection.
 *
 * QUEUE HYGIENE: the portal has no worklist — a review claims the NEXT queued request blindly and
 * matches it by persona, which a stale upload of the same persona also satisfies. So the queue is
 * drained before this journey submits, drained again by the teardown if the upload is never reviewed,
 * and the send-video journeys run one platform at a time (CI's `send-video` lane), never concurrently.
 */
describe('Verified journey: non-photo card, send video', () => {
  /** What the scripted review claimed — named by the decision wait's failure, should the app never see it. */
  let reviewed: ClaimedRequestSummary | undefined

  before(() => {
    setTestUser(TestUsers.nonPhoto)
  })

  after(async () => {
    await cleanUpQueuedSubmission()
  })

  it('clears the review queue before submitting', async () => {
    await clearReviewQueueBeforeSubmit()
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

  it('adds the required photo ID', async () => {
    await reachAdditionalPhotoIdList()
    await captureAdditionalPhotoId(getTestUser(), ADDITIONAL_ID_MATCH)
    await submitEvidenceIdCollection(getTestUser().documentNumber)
    await reachVerificationMethod()
  })

  it('records and uploads a send-video request', async () => {
    await submitSendVideoVerification(getTestUser())
  })

  it('is approved by the agent (scripted against the SIT review portal)', async () => {
    const user = getTestUser()
    reviewed = await reviewSendVideoRequest({
      decision: 'approve',
      cardSerialNumber: user.cardSerial,
      surname: user.lastName,
      firstName: user.firstName,
    })
  })

  it('picks up the approval and lands on verified Home', async () => {
    await waitForSendVideoDecision('verified', { reviewed })
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
