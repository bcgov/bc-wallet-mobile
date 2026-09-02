import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  cleanUpQueuedSubmission,
  clearReviewQueueBeforeSubmit,
  enterBirthdate,
  enterSerialManually,
  reachVerificationMethod,
  resumeVerification,
  startVerification,
  submitSendVideoVerification,
  waitForSendVideoDecision,
} from '../../../src/flows/verify.js'
import { type ClaimedRequestSummary, reviewSendVideoRequest } from '../../../src/helpers/approval.js'
import { HomeScreen, SettingsScreen } from '../../../src/screens/main.js'
import { PendingReviewScreen, VerificationSuccessScreen } from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/**
 * Verified journey: send video, approved — the send-video method end to end, the one verification path
 * that finishes on an agent's decision rather than on a button the user presses.
 *
 * One ordered session: onboard → manual serial → birthdate → method selection → the full capture chain
 * (selfie photo, prompted recording, upload) → Home, then the REAL agent approval, scripted against the
 * IDCheck SIT review portal (`reviewSendVideoRequest`; needs `SM_USER`/`SM_PASSWORD` on an allowlisted
 * runner), then the app's own status re-check → VerificationSuccess and verified Home.
 *
 * QUEUE HYGIENE: the portal has no worklist — a review claims the NEXT queued request blindly and
 * matches it by persona, which a stale upload of the same persona also satisfies. So the queue is
 * drained before this journey submits, drained again by the teardown if the upload is never reviewed,
 * and the send-video journeys run one platform at a time (CI's `send-video` lane), never concurrently.
 */
describe('Verified journey: send video, approved', () => {
  /** What the scripted review claimed — named by the decision wait's failure, should the app never see it. */
  let reviewed: ClaimedRequestSummary | undefined

  before(() => {
    setTestUser(TestUsers.photo)
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

  it('enters the photo serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
    await reachVerificationMethod()
  })

  it('records and uploads a send-video request', async () => {
    await submitSendVideoVerification(getTestUser())
  })

  it('resumes onto the pending review after a relaunch', async () => {
    // The one resume-matrix row nothing could reach before a submission existed. A relaunch is what
    // makes it worth asserting: the submitted-video flag has to survive native storage and hydration
    // has to route back to the status screen, rather than the in-memory flag carrying it.
    await unlockWithPin(TEST_PIN, { relaunch: true, landing: 'any' })
    await resumeVerification(PendingReviewScreen, Timeouts.APP_LAUNCH)
    await PendingReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Back marks the account unverified rather than popping, which returns the stack to Home — where
    // the decision wait below starts.
    await PendingReviewScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
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
    // The Profile row (→ AccountDetails) is verified-gated, so its presence is what proves the
    // agent's approval actually flipped the account — not just that the app showed a success screen.
    assert.ok(
      await SettingsScreen.isVisible('profile'),
      'the Settings Profile row is verified-gated and should be visible after verification'
    )
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
