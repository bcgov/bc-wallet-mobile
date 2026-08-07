import { TestUsers } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  enterBirthdate,
  enterSerialManually,
  expectCancelledReviewReason,
  reachVerificationMethod,
  recordOverLongVideoDetour,
  startVerification,
  submitSendVideoVerification,
  waitForSendVideoDecision,
} from '../../../src/flows/verify.js'
import { reviewSendVideoRequest } from '../../../src/helpers/approval.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/**
 * Verified journey: send video, rejected — the same submission as the approved journey, decided the
 * other way, because a rejection is not just "no": it carries the agent's reason back into the app.
 *
 * The reason below is what the script sends as the reviewer's comment and what the cancelled-review
 * screen must then display, so this asserts the whole round trip rather than only the status flip.
 *
 * Deliberately stops at that screen. Its button re-registers the device from scratch to re-enter
 * verification, which is the account-reset journey's story, not this one's.
 *
 * QUEUE HYGIENE: reviews claim the NEXT queued request blindly, so this must not run CONCURRENTLY with
 * the approved journey (the suite is serial at the default `maxInstances: 1`). The script still refuses
 * to review a request whose card serial is not this user's.
 */
const AGENT_REASON = 'Automated e2e rejection'

describe('Verified journey: send video, rejected', () => {
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
    await reachVerificationMethod()
  })

  it('rejects a recording that runs past the length limit', async () => {
    // Rides here rather than in its own journey because it uploads nothing: the take is discarded, so
    // no submission reaches the agent queue and the real one below is still this session's only item.
    await recordOverLongVideoDetour(getTestUser())
  })

  it('records and uploads a send-video request', async () => {
    await submitSendVideoVerification(getTestUser())
  })

  it('is rejected by the agent, with a reason (scripted against the SIT review portal)', async () => {
    const user = getTestUser()
    await reviewSendVideoRequest({
      decision: 'reject',
      cardSerialNumber: user.cardSerial,
      surname: user.lastName,
      firstName: user.firstName,
      verificationComment: AGENT_REASON,
    })
  })

  it('shows the cancelled review with the agent reason', async () => {
    await waitForSendVideoDecision('cancelled')
    await expectCancelledReviewReason(AGENT_REASON)
  })
})
