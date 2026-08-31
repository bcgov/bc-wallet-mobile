import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  chooseVideoCallMethod,
  enterBirthdate,
  enterSerialManually,
  exerciseInCallControls,
  expectCallBusyOrClosedVariant,
  leaveLiveCall,
  reachStartCallViaSelfie,
  reachVerificationMethod,
  startLiveCall,
  startVerification,
} from '../../../src/flows/verify.js'
import {
  CallBusyOrClosedScreen,
  StartCallScreen,
  VerificationMethodSelectionScreen,
  VerifyNotCompleteScreen,
} from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/**
 * Verify journey: video call — the live-call method driven through a REAL call and back, stopping
 * only at the approval boundary.
 *
 * The app joins the Pexip room as a WebRTC guest; SIT's Test Harness queue AUTO-ANSWERS as the chair
 * host (observed 2026-08-27 — within seconds), which puts a genuine two-way call in CI reach: remote
 * stream up, in-call controls live. What it does NOT do is approve — the verification stays pending,
 * so ending the call lands on VerifyNotComplete (an ending that reaches VerificationSuccess fails
 * loudly: an auto-approving agent would mean extending this journey to full completion — see UAT-3).
 * SIT's service hours decide at runtime which half runs; the other half's checkpoints skip.
 *
 * - OPEN: selfie → StartCall → the real setup chain (evidence upload → session mint → WebRTC guest
 *   connect) settles as answered (usual on SIT) or waiting at the queue — answered exercises the
 *   in-call controls then EndCall, waiting cancels from the loading view — → VerifyNotComplete →
 *   Try Again back to method selection.
 * - CLOSED/BUSY: CallBusyOrClosed asserted in full (known variant title, hours, reminder) and its
 *   SendVideo reset back to method selection. The nightly runs at midnight PT, so it deterministically
 *   gets 'closed'.
 *
 * The open half is CAMERA-ONLY (the selfie: Sauce injection, a real device, or the emulator's
 * emulated camera) and submits nothing for review — no queue hygiene rules apply. Ends unverified,
 * like the send-video reject journey.
 */
describe('Verify journey: video call to the approval boundary', () => {
  let entry: 'open' | 'busyOrClosed' | undefined
  let callOutcome: 'waiting' | 'connected' | undefined

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

  it('chooses the video-call method and branches on service availability', async () => {
    entry = await chooseVideoCallMethod()
    console.log(`[video-call-journey] Service availability branch: ${entry}`)
  })

  it('closed: asserts the busy/closed status screen in full and recovers', async function () {
    if (entry !== 'busyOrClosed') {
      return this.skip()
    }
    const variant = await expectCallBusyOrClosedVariant()
    console.log(`[video-call-journey] CallBusyOrClosed variant: ${variant}`)
    // Plain tap: SendVideo's id is ALSO method selection's send-video button, so a confirm-and-retry
    // after the reset would enter the send-video flow. Arrival is proven by an id the status screen
    // does not render (its hours heading matches method selection's, so `expectVisible` cannot).
    await CallBusyOrClosedScreen.tap('primary')
    await VerificationMethodSelectionScreen.waitFor('videoCall', Timeouts.SCREEN_TRANSITION)
  })

  it('open: takes the selfie and reaches StartCall', async function () {
    if (entry !== 'open') {
      return this.skip()
    }
    await reachStartCallViaSelfie(getTestUser())
    // The screen's own copy of the hours block — the same list the busy/closed branch asserts.
    assert.ok(
      await StartCallScreen.isVisible('hoursOfServiceTitle'),
      'StartCall should show the hours-of-service block'
    )
  })

  it('open: starts the call and reaches the agent queue', async function () {
    if (entry !== 'open') {
      return this.skip()
    }
    callOutcome = await startLiveCall()
  })

  it('open: exercises the in-call controls when the harness agent answers', async function () {
    if (entry !== 'open' || callOutcome !== 'connected') {
      return this.skip()
    }
    await exerciseInCallControls()
  })

  it('open: leaves the call at the approval boundary and lands on VerifyNotComplete', async function () {
    if (entry !== 'open') {
      return this.skip()
    }
    assert.ok(callOutcome, 'the call checkpoint must have settled before leaving')
    await leaveLiveCall(callOutcome)
  })

  it('open: recovers from VerifyNotComplete back to method selection', async function () {
    if (entry !== 'open') {
      return this.skip()
    }
    // Both recovery actions must be offered before one is taken.
    assert.ok(await VerifyNotCompleteScreen.isVisible('sendVideo'), 'VerifyNotComplete should offer Send Video')
    assert.ok(await VerifyNotCompleteScreen.isVisible('tryAgain'), 'VerifyNotComplete should offer Try Again')
    // TryAgain is safe to confirm-and-retry (its id is not on method selection, unlike SendVideo's).
    await VerifyNotCompleteScreen.tapToNavigate('secondary')
    await VerificationMethodSelectionScreen.waitFor('videoCall', Timeouts.SCREEN_TRANSITION)
  })
})
