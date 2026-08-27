import type { TestUser } from '../constants.js'
import { COMBO_CARD_BARCODE_MASKS, Timeouts } from '../constants.js'
import { acceptSystemAlertsUntil, tapAlertButton } from '../helpers/alerts.js'
import { isAppErrorShowing, throwIfAppErrorShowing } from '../helpers/app-error.js'
import { ApproveInPersonInput, approveInPersonRequest } from '../helpers/approval.js'
import type { ImageMaskRegion } from '../helpers/camera.js'
import { canInjectImages, injectPhoto, injectScanTarget } from '../helpers/camera.js'
import { getEmailConfirmationCode, getLatestMailId, getTempEmailAddress } from '../helpers/email.js'
import { swipeUpBy } from '../helpers/gestures.js'
import {
  closeHelpMenu,
  HelpMenuRows,
  openHelpMenu,
  RestartVerificationAlert,
  tapHelpMenuRow,
} from '../helpers/help-menu.js'
import { describeCurrentScreen, reachCameraScreen } from '../helpers/screens.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { HomeNotificationCard, HomeScreen } from '../screens/main.js'
import { VerifyPromptScreen } from '../screens/onboarding.js'
import {
  AccountSetupScreen,
  AdditionalIdentificationRequiredScreen,
  CallBusyOrClosedScreen,
  CancelledReviewScreen,
  DualIdentificationRequiredScreen,
  EmailConfirmationScreen,
  EmailVerifiedScreen,
  EnterBirthdateScreen,
  EnterEmailScreen,
  EvidenceCaptureScreen,
  EvidenceIDCollectionScreen,
  IdentitySelectionScreen,
  IDPhotoInformationScreen,
  LiveCallErrorScreen,
  LiveCallLoadingScreen,
  LiveCallScreen,
  ManualSerialScreen,
  PendingReviewScreen,
  PhotoInstructionsScreen,
  PhotoReviewScreen,
  ResidentialAddressScreen,
  ScanSerialScreen,
  SelfieCaptureScreen,
  StartCallScreen,
  SuccessfullySentScreen,
  TakeVideoScreen,
  VerificationMethodSelectionScreen,
  VerificationSuccessScreen,
  VerifyInPersonScreen,
  VerifyNotCompleteScreen,
  VideoInstructionsScreen,
  VideoReviewScreen,
  VideoTooLongScreen,
} from '../screens/verify.js'

/**
 * Verify-stack arranges: the entry spine plus the per-step arranges that mirror the app's
 * `getResumeStepRoute` (id → address → email → verify), composed with `reachVerificationMethod()`.
 *
 * VerifyPrompt exists only in the session that completed onboarding — run `completeOnboarding()` first
 * and never relaunch in between.
 */

const engine = new BaseScreen()

/** Confirming action on EnterEmail's skip alert — copy-matched, as its buttons carry no testIDs. */
const EMAIL_SKIP_CONFIRM = 'Skip'

/**
 * VerifyPrompt `Continue` → the AccountSetup add-or-transfer choice.
 *
 * `tapToReach`, not `tap`: this pair sits on a freshly pushed screen, and react-navigation renders a
 * screen before it makes it interactive — the control is visible and steady, and the tap is discarded
 * anyway. Confirming the destination is what turns that into a re-tap instead of a failed journey.
 */
export async function startVerification(): Promise<void> {
  await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerifyPromptScreen.tapToReach('primary', AccountSetupScreen)
}

/** AccountSetup `AddAccount` → IdentitySelection. Confirm-and-retry, for the reason above. */
export async function chooseAddAccount(): Promise<void> {
  await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await AccountSetupScreen.tapToReach('primary', IdentitySelectionScreen)
}

/**
 * Help menu → "Back to home", KEEPING progress (the app only moves the status out of IN_PROGRESS).
 * Available on every verify screen except VerifyPrompt and the two transfer screens.
 */
export async function leaveVerificationToHome(): Promise<void> {
  await openHelpMenu()
  await tapHelpMenuRow(HelpMenuRows.backToHome)
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Re-enter an interrupted verification from Home's verification card — the only route back in, since
 * the in-progress flag is in-memory. The stack mounts at `getResumeStepRoute`; which screen that is,
 * is the caller's assertion.
 */
export async function resumeVerification(): Promise<void> {
  await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeNotificationCard.tapToNavigate('primary')
}

/**
 * Help menu → "Restart verification process", answering its confirmation alert.
 *
 * `confirm` wipes progress and re-registers the device with IAS, reopening on AccountSetup — NOT
 * IdentitySelection. `cancel` leaves the menu open, so it is closed here.
 */
export async function restartVerification(answer: 'confirm' | 'cancel'): Promise<void> {
  await openHelpMenu()
  await tapHelpMenuRow(HelpMenuRows.restartVerification)
  if (answer === 'cancel') {
    await tapAlertButton(RestartVerificationAlert.cancel)
    await closeHelpMenu()
    return
  }
  await tapAlertButton(RestartVerificationAlert.confirm)
}

/**
 * The CI-default serial path, no live camera: `Scan` → ScanSerial (accepting the OS camera dialog if it
 * appears) → `EnterManually` → serial typed → EnterBirthdate. Card type is derived later, by
 * `authorizeDevice` at the birthdate submit.
 */
export async function enterSerialManually(user: TestUser): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('primary')
  await reachCameraScreen('ScanSerial', () => ScanSerialScreen.isPresent(1_000))
  await ScanSerialScreen.tapToNavigate('primary')
  await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ManualSerialScreen.fill('serial', user.cardSerial, { tapFirst: true })
  await engine.dismissKeyboard()
  await ManualSerialScreen.tapWhenEnabled('primary')
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Fill and SUBMIT the birthdate — the submit fires `authorizeDevice(serial, dob)`, which derives the
 * card type. Callers assert the post-authorize screen themselves (it differs per card type); for a
 * no-network fill, use `EnterBirthdateScreen.fill(...)` directly.
 */
export async function enterBirthdate(user: TestUser): Promise<void> {
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterBirthdateScreen.fill('birthdate', user.dob, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterBirthdateScreen.tapWhenEnabled('primary')
}

/** The SiteMinder approval payload for a user's flow: serial + birthdate, typed document numbers, or both. */
function approvalInputForUser(user: TestUser): ApproveInPersonInput {
  if (user.flow === 'non-bcsc') {
    return {
      flow: 'non-bcsc',
      documents: [
        { typeId: user.primaryDocumentTypeId, number: user.primaryDocumentNumber },
        { typeId: user.documentTypeId, number: user.documentNumber },
      ],
    }
  }
  if (user.flow === 'non-photo') {
    return {
      flow: 'non-photo',
      cardSerialNumber: user.cardSerial,
      cardBirthdate: user.dob,
      document: { typeId: user.documentTypeId, number: user.documentNumber },
    }
  }
  return { flow: 'photo', cardSerialNumber: user.cardSerial, cardBirthdate: user.dob }
}

/**
 * From the post-authorize state, reach VerificationMethodSelection. The address step is auto-satisfied
 * once the device is authorized; the email step only appears when the card supplied no verified email —
 * detect it by its SkipEmail button and skip it (BCSC cards allow skipping).
 */
export async function reachVerificationMethod(): Promise<void> {
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await VerificationMethodSelectionScreen.isPresent(1_000)) {
      return
    }
    if (await EnterEmailScreen.isVisible('skip')) {
      await EnterEmailScreen.tap('secondary') // SkipEmail (BCSC flow) → confirmation alert
      // Confirm-gated: the tap only raises the alert, which blocks the screen until answered. Unexercised
      // today, as every SIT BCSC card carries a verified email.
      await tapAlertButton(EMAIL_SKIP_CONFIRM)
      await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      return
    }
    if (Date.now() > deadline) {
      throw new Error(
        `reachVerificationMethod: neither VerificationMethodSelection nor EnterEmail appeared. On screen: ${await describeCurrentScreen()}`
      )
    }
    // VerificationMethodSelection anchors on the Hours-of-Service heading, which can sit below the fold
    // where isPresent() (which never scrolls) reads an arrival as a miss. Nudge it into view.
    await swipeUpBy()
  }
}

/**
 * Complete verification via the IN-PERSON method — the only CI-completable one (send-video and
 * live-call open camera screens). From VerificationMethodSelection: read the confirmation code, drive
 * the real SiteMinder SIT approval (needs `SM_USER`/`SM_PASSWORD` and an allowlisted runner IP), then
 * Complete → VerificationSuccess → Home.
 */
export async function completeVerification(user: TestUser): Promise<void> {
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('inPerson')

  await VerifyInPersonScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const confirmationCode = await VerifyInPersonScreen.read('confirmationCode')
  await approveInPersonRequest(confirmationCode, approvalInputForUser(user))

  await VerifyInPersonScreen.tapWhenEnabled('primary') // Complete
  await VerificationSuccessScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationSuccessScreen.tap('primary') // Continue → exits verify stack to Home

  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Upper bound on prompts to answer before calling the recording stuck. The set is server-issued (three
 * today), and each prompt costs at least MIN_PROMPT_DURATION_SECONDS, so this also has to stay well
 * inside the app's 30s recording ceiling.
 */
const MAX_VIDEO_PROMPTS = 8

/**
 * Budget for a prompt's button to enable. Generous against the app's per-prompt minimum, but short
 * enough that the finalizing-recording window (where it never enables again) is not a long stall.
 */
const PROMPT_ENABLE_TIMEOUT_MS = 10_000

/** Just past the app's 30s recording cap — long enough to trip it, short enough not to idle a session. */
const OVER_LONG_RECORDING_MS = 32_000

/** How long to keep re-entering PendingReview before giving up on the agent's decision. */
const REVIEW_DECISION_TIMEOUT_MS = 180_000

/** Gap between those re-entries. Each one is a fresh status check, not a retry of a stuck request. */
const REVIEW_DECISION_POLL_MS = 5_000

/**
 * Submit a send-video verification: selfie photo, the prompted recording, upload, and out to Home —
 * the state in which an agent decision can be scripted (`reviewSendVideoRequest`) and then awaited
 * with {@link waitForSendVideoDecision}.
 *
 * CAMERA-ONLY. On Sauce the selfie is injected; the RECORDING is not — there is no video injection, so
 * the recorder captures whatever the rack camera sees. That does not matter: the scripted reviewer
 * never watches it, and the flow only needs a recording to upload.
 */
export async function submitSendVideoVerification(user: TestUser): Promise<void> {
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('sendVideo')

  await PhotoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Plain tap, NOT tapToNavigate: the camera's shutter carries the same testID as this CTA, so a
  // confirm-and-retry would read the push as a miss and fire the shutter.
  await PhotoInstructionsScreen.tap('primary')
  await captureSelfie(user)
  await recordPromptedVideo()

  await VideoReviewScreen.tapWhenEnabled('primary') // UseVideo → RESETS to EvidenceUploading, which uploads on mount
  await SuccessfullySentScreen.expectVisible(Timeouts.VIDEO_UPLOAD)
  await SuccessfullySentScreen.tapToNavigate('primary') // Go to home — the screen's only way out

  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * The selfie half: enter the front camera, inject when the session can, shoot, accept. UsePhoto RESETS
 * to where the branch goes next — VideoInstructions (send-video) or StartCall (live-call) — so the
 * caller asserts the destination.
 */
async function captureSelfie(user: TestUser): Promise<void> {
  await reachCameraScreen('TakePhoto (selfie)', () => SelfieCaptureScreen.isPresent(1_000))
  // The send-video lane runs without injection (it breaks the recorder) — the rack feed is fine
  // here, since the scripted reviewer never looks at the content.
  if (canInjectImages()) {
    // No masks: the selfie template carries no barcode, unlike the card-back images.
    await injectPhoto(user.selfieImage, {})
  }
  await SelfieCaptureScreen.tap('primary') // shutter — NOT tapToNavigate (not idempotent)
  await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await PhotoReviewScreen.tapToNavigate('primary') // UsePhoto — its id is not on either reset destination
}

/**
 * The recording half: start, answer the prompts, land on the review. How many prompts there are is
 * server-issued, so this never counts them — the last one ends the recording by itself.
 */
async function recordPromptedVideo(): Promise<void> {
  await startVideoRecording()
  await answerVideoPrompts()

  // The device's own recorder failing is not a test failure to reason about — report the app's error
  // rather than the symptom, so a rack-camera flake is never mistaken for a broken journey. Probed
  // BEFORE the review, whose full transition budget would otherwise be spent on a screen that is
  // never coming.
  await throwIfAppErrorShowing('The recording failed')

  // Finalizing the file takes a moment after the recording stops, so the review is a transition wait.
  if (await VideoReviewScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
    return
  }
  // Probed only now that the recorder is gone: VideoTooLong's marker is a BARE `Cancel`, and TakeVideo's
  // own cancel control carries "Cancel" as its accessibility label — which iOS reports as the element
  // name when no identifier is set, so the same selector matches it while that screen is up.
  if (await VideoTooLongScreen.isPresent(1_000)) {
    throw new Error(
      'The recording ran past the 30s limit and landed on VideoTooLong. Each prompt is held for a minimum ' +
        'duration before its button enables, so this means the run answered them too slowly.'
    )
  }
  throw new Error(
    `The recording did not reach the review after ${MAX_VIDEO_PROMPTS} prompts. On screen: ${await describeCurrentScreen()}`
  )
}

/** VideoInstructions → an armed recorder, with the prompt set the recording will be judged against. */
async function startVideoRecording(): Promise<void> {
  await VideoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Disabled until a fresh prompt set lands — the wait for it IS the wait for the fetch.
  await VideoInstructionsScreen.tapWhenEnabled('primary')

  // No start button: recording arms itself after a 3-2-1 countdown, behind camera AND microphone
  // dialogs, so the first prompt button gets a camera budget rather than a transition one.
  //
  // The error modal counts as "we got somewhere": iOS drops the covered recorder out of the
  // accessibility tree, so a recording that fails on arm would otherwise spend the whole camera budget
  // waiting for a screen that is already there and unreachable. Ending the wait on either outcome lets
  // the assert below name the app's error instead of a 45s timeout.
  await reachCameraScreen(
    'TakeVideo',
    async () => (await TakeVideoScreen.isPresent(1_000)) || (await isAppErrorShowing())
  )
  await throwIfAppErrorShowing('The recording failed to start')
}

/**
 * Answer prompts until the recorder is done with us. Callers assert where that left them — this only
 * gets the recording stopped, and both of its endings (review, too-long) go through here.
 */
async function answerVideoPrompts(): Promise<void> {
  for (let prompt = 0; prompt < MAX_VIDEO_PROMPTS; prompt++) {
    if (!(await TakeVideoScreen.isPresent(1_000))) {
      return
    }
    // Android keeps the covered recorder in a second window, so its controls stay findable and
    // enabled under the error modal — without this, a failed recording spends every remaining prompt
    // driving a screen nothing is listening to.
    if (await isAppErrorShowing()) {
      return
    }
    try {
      await TakeVideoScreen.tapWhenEnabled('primary', PROMPT_ENABLE_TIMEOUT_MS)
    } catch {
      // The button stops enabling once the last prompt has stopped the recording, while the screen is
      // still up finalizing the file. Nothing is swallowed: the caller asserts what we landed on.
      return
    }
  }
}

/**
 * Record past the app's length cap and finish the take, which the app rejects with VideoTooLong instead
 * of the review — then take that screen's Cancel back to method selection.
 *
 * Uploads nothing, so it leaves no submission in the agent queue and can precede a real one.
 */
export async function recordOverLongVideoDetour(user: TestUser): Promise<void> {
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('sendVideo')

  await PhotoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await PhotoInstructionsScreen.tap('primary')
  await captureSelfie(user)
  await startVideoRecording()

  // Hold BEFORE answering anything: the length is only judged when the recording ends, so the overrun
  // has to happen while it is still running. A client-side pause, so no single command is left hanging.
  await driver.pause(OVER_LONG_RECORDING_MS)
  await answerVideoPrompts()

  // Same reason as the review path: a recorder that errored never reaches the length check, and the
  // app's own error says so where "Cancel not visible" does not.
  await throwIfAppErrorShowing('The over-long recording failed')
  await VideoTooLongScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Cancel, the screen's only addressable control — Retake has no testID at all.
  await VideoTooLongScreen.tap('secondary')
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

type ReviewSettleStatus = 'verified' | 'cancelled' | 'pending'

/**
 * Polls the three post-resume outcomes until one is present, returning 'pending' for a still-queued
 * request so the caller can decide whether to keep polling or give up.
 */
async function waitForReviewSettleStatus(): Promise<ReviewSettleStatus> {
  const settleBy = Date.now() + Timeouts.SCREEN_TRANSITION
  for (;;) {
    if (await VerificationSuccessScreen.isPresent(1_000)) {
      return 'verified'
    }
    if (await CancelledReviewScreen.isPresent(1_000)) {
      return 'cancelled'
    }
    if (await PendingReviewScreen.isPresent(1_000)) {
      return 'pending' // still pending — leave and come back for another status check
    }
    if (Date.now() > settleBy) {
      throw new Error(
        `Re-entering verification reached none of PendingReview / VerificationSuccess / CancelledReview. On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}

/** Throws when the settled decision does not match what this journey scripted. */
function assertExpectedDecision(actual: 'verified' | 'cancelled', expected: 'verified' | 'cancelled'): void {
  if (actual === expected) {
    return
  }
  throw actual === 'verified'
    ? new Error('The request was APPROVED, but this journey scripted a rejection')
    : new Error('The request was REJECTED, but this journey scripted an approval')
}

/**
 * Wait for the agent's decision to reach the app, and assert it is the expected one.
 *
 * Re-entering PendingReview is the poll: it re-checks the request status on every mount and navigates
 * on by itself, so this loops Home → verification card → decision-or-back-out. Backgrounding and
 * foregrounding would NOT do — the Home-side status check runs once per stack mount, not per resume.
 * The push notification is advisory and never navigates, so it is not waited on either.
 */
export async function waitForSendVideoDecision(expected: 'verified' | 'cancelled'): Promise<void> {
  const deadline = Date.now() + REVIEW_DECISION_TIMEOUT_MS
  for (;;) {
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await resumeVerification()

    const status = await waitForReviewSettleStatus()
    if (status !== 'pending') {
      assertExpectedDecision(status, expected)
      return
    }

    if (Date.now() + REVIEW_DECISION_POLL_MS >= deadline) {
      throw new Error(
        `The agent decision (${expected}) did not reach the app within ${REVIEW_DECISION_TIMEOUT_MS}ms of re-checking. ` +
          'The scripted review reported success, so suspect the status endpoint or a submission other than this one.'
      )
    }
    // Back does not pop here: it marks the account unverified, which swaps the stack back to Home.
    await PendingReviewScreen.back.tap()
    await driver.pause(REVIEW_DECISION_POLL_MS)
  }
}

/**
 * Escapes a string for embedding inside a double-quoted literal in an iOS predicate string or an
 * Android UiSelector expression. Backslashes are escaped first so a reason containing one is not
 * later mistaken for an escape sequence introduced by this function.
 */
function escapeForSelectorLiteral(value: string): string {
  return value.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`)
}

/**
 * Assert the cancelled-review modal is showing the agent's reason — the text the rejecting script sent
 * as `verificationComment`. Matched as a SUBSTRING: the app renders it inside a longer "Details from
 * Service BC agent:" sentence, in one text node.
 */
export async function expectCancelledReviewReason(reason: string): Promise<void> {
  await CancelledReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const escapedReason = escapeForSelectorLiteral(reason)
  const selector = driver.isIOS
    ? `-ios predicate string:label CONTAINS "${escapedReason}"`
    : `android=new UiSelector().textContains("${escapedReason}")`
  const detail = $(selector)
  if (!(await detail.isDisplayed().catch(() => false))) {
    throw new Error(
      `CancelledReview does not show the agent reason "${reason}". On screen: ${await describeCurrentScreen()}`
    )
  }
}

/** Where the Video Call method button landed: open service hours → the selfie primer; otherwise the status screen. */
export type LiveCallEntry = 'open' | 'busyOrClosed'

/**
 * Method selection → Video Call. The app routes on the agent-queue destinations and service hours:
 * open lands on the shared PhotoInstructions (live-call flavour), busy/closed on CallBusyOrClosed.
 * Which one is SIT's answer at this moment, so the branch is returned for the journey to dispatch on —
 * both are legitimate outcomes for a suite that runs day and night.
 */
export async function chooseVideoCallMethod(): Promise<LiveCallEntry> {
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('videoCall')
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  for (;;) {
    if (await CallBusyOrClosedScreen.isPresent(1_000)) {
      return 'busyOrClosed'
    }
    if (await PhotoInstructionsScreen.isPresent(1_000)) {
      return 'open'
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Video Call led to neither PhotoInstructions nor CallBusyOrClosed. On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}

/** The two CallBusyOrClosed title variants, keyed by the `busy` route param that selects them. */
const CALL_STATUS_TITLES = {
  busy: 'All agents are busy', // BCSC.VideoCall.CallBusyOrClosed.AllAgentsBusy
  closed: 'Call us later', // BCSC.VideoCall.CallBusyOrClosed.CallUsLater
} as const

/**
 * Assert CallBusyOrClosed is showing one of its two variants IN FULL — a status title matching a known
 * variant, the hours-of-service block, and the add-your-card-again reminder — and return which.
 *
 * 'busy' means the destination list offered no usable queue (a config state, not live agent load);
 * 'closed' covers outside-service-hours and the hours-fetch-failed fallback. SIT keeps a Test Harness
 * queue destination, so 'closed' is what a night run deterministically gets.
 */
export async function expectCallBusyOrClosedVariant(): Promise<'busy' | 'closed'> {
  await CallBusyOrClosedScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const title = await CallBusyOrClosedScreen.read('callStatusTitle')
  const variant = (Object.keys(CALL_STATUS_TITLES) as ('busy' | 'closed')[]).find(
    (key) => CALL_STATUS_TITLES[key] === title
  )
  if (!variant) {
    throw new Error(`CallBusyOrClosed shows an unknown status title: "${title}"`)
  }
  await CallBusyOrClosedScreen.waitFor('hoursOfServiceTitle', Timeouts.SCREEN_TRANSITION)
  await CallBusyOrClosedScreen.waitFor('reminderTitle', Timeouts.SCREEN_TRANSITION)
  return variant
}

/**
 * The open-hours live-call arrange: PhotoInstructions → selfie capture (injected on Sauce, the rack or
 * device camera otherwise) → StartCall. The UsePhoto accept RESETS the stack to [PhotoInstructions,
 * StartCall], so backing out of StartCall returns to the instructions, not the review.
 */
export async function reachStartCallViaSelfie(user: TestUser): Promise<void> {
  await PhotoInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Plain tap, NOT tapToNavigate: the camera's shutter carries the same testID as this CTA, so a
  // confirm-and-retry would read the push as a miss and fire the shutter.
  await PhotoInstructionsScreen.tap('primary')
  await captureSelfie(user)
  await StartCallScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** How the live-call setup settled: queued at the human boundary, or actually answered by an agent. */
export type LiveCallOutcome = 'waiting' | 'connected'

/** BCSC.VideoCall.CallStates.WaitingForAgent — the loading state that proves the queue was reached. */
const WAITING_FOR_AGENT_COPY = 'Waiting for an agent to join...'

/** Budget for the whole call setup: selfie upload, session mint, Pexip WebRTC connect, queue entry. */
const LIVE_CALL_SETUP_TIMEOUT_MS = 90_000

/**
 * StartCall → LiveCall → the agent queue. The Start press requests microphone permission (Android adds
 * Bluetooth on 12+, and WebRTC can raise iOS's local-network prompt mid-connect), so the whole wait
 * accepts system dialogs until the call settles on one of three outcomes:
 *
 * - 'waiting' — evidence uploaded, session minted, WebRTC connected as the Pexip guest, queued until
 *   a host (agent) joins. The human boundary — where a run stops when nobody answers.
 * - 'connected' — an agent ANSWERED (the in-call controls are up). SIT's Test Harness queue does this
 *   (observed 2026-08-27: it auto-answers within seconds), so on SIT this is the common outcome; it
 *   converges on the same exit (`leaveLiveCall` handles both) and does NOT approve the verification.
 * - CallErrorView → throws, surfacing the app's own error where a bare wait would report a timeout.
 */
export async function startLiveCall(): Promise<LiveCallOutcome> {
  await StartCallScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await StartCallScreen.tapWhenEnabled('primary')

  let outcome: LiveCallOutcome | 'error' | null = null
  const settled = await acceptSystemAlertsUntil(
    async () => {
      if (await LiveCallScreen.isPresent(500)) {
        outcome = 'connected'
        return true
      }
      if (await engine.isTextDisplayed(WAITING_FOR_AGENT_COPY)) {
        outcome = 'waiting'
        return true
      }
      if (await LiveCallErrorScreen.isPresent(500)) {
        outcome = 'error'
        return true
      }
      return false
    },
    { timeoutMs: LIVE_CALL_SETUP_TIMEOUT_MS }
  )

  if (!settled || outcome === null) {
    throw new Error(
      `The live call did not reach the agent queue within ${LIVE_CALL_SETUP_TIMEOUT_MS}ms. ` +
        `On screen: ${await describeCurrentScreen()}`
    )
  }
  if (outcome === 'error') {
    throw new Error(
      `The live-call setup failed — CallErrorView is showing. On screen: ${await describeCurrentScreen()}`
    )
  }
  console.log(`[live-call] Settled: ${outcome === 'waiting' ? 'queued, waiting for an agent' : 'an agent ANSWERED'}`)
  return outcome
}

/**
 * In-call checkpoint, reachable whenever the Test Harness agent answers: the control row is usable.
 * Mute and video each get a there-and-back toggle (each tap flips the local track state), and the
 * having-trouble affordance must be offered. Kept SHORT on purpose — the far side owns the call's
 * lifetime, so this must not dwell in it.
 */
export async function exerciseInCallControls(): Promise<void> {
  await LiveCallScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await LiveCallScreen.link('mute')
  await LiveCallScreen.link('mute')
  await LiveCallScreen.link('video')
  await LiveCallScreen.link('video')
  if (!(await LiveCallScreen.isVisible('havingTrouble'))) {
    throw new Error('The in-call HavingTrouble control is missing')
  }
}

/**
 * Leave the live call from either settle outcome — Cancel on the loading/waiting view, EndCall once
 * connected — and ride the app's own exit: the CALL_ENDED processing view, a verification-status
 * re-check, then the stack reset to [VerificationMethodSelection, VerifyNotComplete] for an account
 * that is (as expected in CI) not verified.
 */
export async function leaveLiveCall(outcome: LiveCallOutcome): Promise<void> {
  if (outcome === 'connected') {
    // The far side owns the call too: if the harness agent hung up first, the app is already on its
    // way out through the same reset this waits on — only tap EndCall while the call is still up.
    if (await LiveCallScreen.isPresent(1_000)) {
      await LiveCallScreen.tap('primary') // EndCall
    }
  } else {
    await LiveCallLoadingScreen.tap('primary') // Cancel
  }
  // Pexip disconnect + two session-status calls + the verification re-check run behind the processing
  // view before the reset lands, so the exit gets a launch-sized budget rather than a transition one.
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await VerifyNotCompleteScreen.isPresent(1_000)) {
      return
    }
    if (await VerificationSuccessScreen.isPresent(1_000)) {
      throw new Error(
        'The live call ended VERIFIED (VerificationSuccess) — an SIT agent approved the request. ' +
          'Record the Test Harness queue behavior in the UAT-3 notes and extend the journey to full completion.'
      )
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Leaving the live call reached neither VerifyNotComplete nor VerificationSuccess. ` +
          `On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}

/**
 * Start the email step against a throwaway inbox, continuing to EmailConfirmation. Returns the inbox
 * token the code is later read with.
 *
 * Non-BCSC only: the step is mandatory there (Skip is hidden), while BCSC cards carry a verified email
 * and never see it — those use `reachVerificationMethod` instead.
 */
export async function startEmailVerification(): Promise<string> {
  const { email, token } = await getTempEmailAddress()

  await EnterEmailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterEmailScreen.fill('email', email, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterEmailScreen.tapWhenEnabled('primary') // Continue → createEmailVerification → EmailConfirmation

  await EmailConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  return token
}

/**
 * Type a code into EmailConfirmation and Continue. Asserts NOTHING about what follows — a correct code
 * resets the stack to EmailVerified, a wrong one stays put with an inline error — so the caller decides.
 */
export async function submitEmailCode(code: string): Promise<void> {
  await EmailConfirmationScreen.fill('code', code, { tapFirst: true })
  await engine.dismissKeyboard()
  await EmailConfirmationScreen.tapWhenEnabled('primary') // Continue → sendCode
}

/**
 * Tap "Send a new code" and return the code from the message that arrives AFTER it.
 *
 * The new message IS the assertion: the resend's only other feedback is a 1.5s toast, and it mints a
 * fresh `email_address_id`, retiring the code already in the inbox.
 */
export async function resendEmailCode(token: string): Promise<string> {
  // Wait for the first code before resending — a baseline taken from a still-empty inbox would let the
  // wait below return that first, now-retired message.
  const alreadyReceived = await getLatestMailId(token)
  await tapResendCodeLink()
  return getEmailConfirmationCode(token, { afterMailId: alreadyReceived })
}

/**
 * Tap "Send a new code". Its testID sits on a `ThemedText` nested inside another, which RN flattens into
 * the parent paragraph — so the accessibility label is tried too, and the failure names that cause
 * rather than reporting a missing element.
 */
async function tapResendCodeLink(): Promise<void> {
  if (await EmailConfirmationScreen.isVisible('resendCode')) {
    await EmailConfirmationScreen.link('resendCode')
    return
  }

  const label = 'Send a new code' // BCSC.EmailConfirmation.SendNewCode
  const selector = driver.isIOS
    ? `-ios predicate string:label == "${label}" OR name == "${label}"`
    : `android=new UiSelector().description("${label}")`
  const link = $(selector)
  if (await link.isDisplayed().catch(() => false)) {
    await link.click()
    return
  }

  throw new Error(
    'EmailConfirmation\'s "Send a new code" link is not addressable by testID or accessibility label: ' +
      'it is a Text nested inside another Text, which RN flattens into the paragraph. Covering the resend ' +
      'branch would need the link moved onto a real pressable in the app.'
  )
}

/**
 * EmailVerified → VerificationMethodSelection. EmailVerified's only testID is the shared Continue, so
 * arrival is confirmed by its title copy.
 */
export async function completeEmailVerification(): Promise<void> {
  const verifiedTitle = await engine.findByText('Your email has been verified')
  await verifiedTitle.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await EmailVerifiedScreen.tap('primary') // RESETS to VerificationMethodSelection

  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** Every EvidenceTypeList row with its testID — discovered, not declared: the ids embed the server's `evidence_type`. */
async function evidenceTypeRows(): Promise<{ id: string; element: WebdriverIO.Element }[]> {
  const rowsSelector = driver.isIOS
    ? '-ios predicate string:name CONTAINS "EvidenceTypeListItem"'
    : 'android=new UiSelector().resourceIdMatches(".*EvidenceTypeListItem.*")'
  await $(rowsSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })

  const attr = driver.isIOS ? 'name' : 'resource-id'
  const rows = await $$(rowsSelector)
  const found: { id: string; element: WebdriverIO.Element }[] = []
  for (const element of rows) {
    found.push({ id: (await element.getAttribute(attr).catch(() => null)) ?? '', element })
  }
  return found
}

/**
 * The testIDs the list is currently offering — for asserting what it does NOT offer. Match as
 * substrings, and print the whole list on failure: it is the only record of what the backend served.
 */
export async function listEvidenceTypeRowIds(): Promise<string[]> {
  return (await evidenceTypeRows()).map((row) => row.id)
}

/**
 * Tap the one EvidenceTypeList row whose testID contains `match` (case-insensitive; the
 * `EvidenceTypeListItem-<evidence_type>` suffix is server-provided, so never guess an exact label).
 * Zero or multiple matches throw with the row ids found, making a mismatch self-diagnosing.
 *
 * Selecting PERSISTS the choice and pushes IDPhotoInformation — stopping here leaves an evidence entry
 * with no photos, the app's "capture interrupted" state.
 */
export async function selectEvidenceType(match: string): Promise<void> {
  const rows = await evidenceTypeRows()
  const needle = match.toLowerCase()
  const ids = rows.map((row) => row.id)
  let target: WebdriverIO.Element | null = null
  let count = 0
  for (const row of rows) {
    if (row.id.toLowerCase().includes(needle)) {
      count += 1
      target = row.element
    }
  }

  if (count === 1 && target) {
    // The list arrives on a push animation — settle the row first, or the tap lands on stale bounds,
    // is silently dropped, and the flow blames the NEXT screen.
    await engine.waitForSteadyPosition(target)
    await target.click()
    return
  }
  throw new Error(
    count === 0
      ? `EvidenceTypeList: no row testID contains "${match}". Rows found: ${JSON.stringify(ids)}`
      : `EvidenceTypeList: "${match}" matched ${count} rows (ambiguous). Rows: ${JSON.stringify(ids)}`
  )
}

/**
 * Wait for EvidenceCapture's shutter, naming which of two causes a timeout was. The shutter renders only
 * once `useCameraDevice` resolves, so a miss means either the push never landed (container absent) or no
 * camera came up (container present) — indistinguishable from the timeout alone.
 *
 * The error modal ends the wait early, same as the recorder's arm (see {@link startVideoRecording}):
 * a camera that failed to open — seen on RE-entries, e.g. a retake — reports the app's own error in
 * seconds instead of spending the whole camera budget on a screen that is never coming.
 */
async function reachEvidenceCamera(): Promise<void> {
  try {
    await reachCameraScreen(
      'EvidenceCapture',
      async () => (await EvidenceCaptureScreen.isPresent(1_000)) || (await isAppErrorShowing())
    )
  } catch (err) {
    const containerMounted = await EvidenceCaptureScreen.isVisible('maskedCamera')
    throw new Error(
      `${(err as Error).message}\nMaskedCamera container ${containerMounted ? 'IS' : 'is NOT'} mounted — ` +
        (containerMounted
          ? 'the screen was reached but no camera device resolved.'
          : 'EvidenceCapture is not on screen: the push never landed, or the app navigated AWAY mid-capture. ' +
            'If the on-screen dump above shows IDPhotoInformation right after a UsePhoto, a barcode decoded ' +
            'off the injected image made the app reroute into card setup — mask the barcode regions ' +
            '(see COMBO_CARD_BARCODE_MASKS) instead of re-tapping through; the flow state is corrupted at that point.')
    )
  }
  await throwIfAppErrorShowing('The evidence camera failed')
}

/**
 * Capture a document's photo(s), repeating per side (1 for a passport, 2 for a licence — backend-driven)
 * until the typed EvidenceIDCollection form appears. CAMERA-ONLY: on Sauce the image is injected before
 * the shutter; on a local device the physical camera captures whatever it sees.
 *
 * `barcodeMasks` MUST cover any decodable barcode on the image: the camera runs a live code scanner
 * behind the shutter that Android's injected frames feed. An unmasked SIT combo barcode gets scanned,
 * and in the non-BCSC flow the app then authorizes THAT card and resets into card setup mid-capture.
 *
 * `retakeFirstSide` exercises PhotoReview's Retake — it re-shoots the same side, so only the
 * discard-and-return path differs.
 */
async function capturePhotoIdDocument(
  image: string,
  barcodeMasks: readonly ImageMaskRegion[] = [],
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Confirm the push landed: a tap dispatched mid-transition is swallowed on Android yet still reports
  // success, and the flow then waits out its timeout on a camera screen that never opened.
  await IDPhotoInformationScreen.tapToNavigate('primary')

  for (let side = 0; side < 2; side++) {
    await shootDocumentSide(image, barcodeMasks)
    if (side === 0 && options.retakeFirstSide) {
      await PhotoReviewScreen.tapToNavigate('secondary') // Retake → back to the camera, same side
      await shootDocumentSide(image, barcodeMasks)
    }
    await PhotoReviewScreen.tapToNavigate('primary') // UsePhoto → next side or the typed form
    if (await EvidenceIDCollectionScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      return
    }
  }
  await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** One trip through the document camera: reach it, inject, fire the shutter, land on PhotoReview. */
async function shootDocumentSide(image: string, barcodeMasks: readonly ImageMaskRegion[]): Promise<void> {
  // Camera permission is requested on first entry — accepted whenever it appears, or EvidenceCapture
  // renders the PermissionDisabled fallback. Later entries still restart the capture session, so every
  // entry gets the camera budget rather than a screen-transition one.
  await reachEvidenceCamera()
  // Injection-free sessions (the send-video lane) shoot the rack feed — accepted like any capture.
  if (canInjectImages()) {
    await injectPhoto(image, {}, barcodeMasks) // padding may need tuning to the document mask
  }
  await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter — NOT tapToNavigate (not idempotent)
  await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * IdentitySelection → ScanSerial, with the camera live (the OS permission dialog is accepted on the
 * way). The scan path's entry point; the typed path is {@link enterSerialManually}.
 */
export async function openSerialScanner(): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('primary') // Scan → ScanSerial
  await reachCameraScreen('ScanSerial', () => ScanSerialScreen.isPresent(1_000))
}

/**
 * Photograph a REAL BC Services Card during non-BCSC evidence capture — the reroute arrange.
 *
 * The exact inverse of {@link capturePhotoIdDocument}: NO barcode masks, so the card's codes decode for
 * real. On UsePhoto the app asks `/device/barcodes`, the backend matches the card, and the app resets
 * into THAT card's own setup flow, discarding the evidence. Where it lands depends on the card process
 * the backend returns, so the caller asserts it.
 *
 * ANDROID ONLY: iOS cannot fire code-39/PDF-417 from injection at all, so the reroute can never happen
 * there. Sauce-only for the same reason injection is.
 *
 * Stops at the UsePhoto tap — a second side never comes, because the reroute replaces the whole stack.
 */
export async function presentBcscCardAsEvidence(scanTarget: string): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IDPhotoInformationScreen.tapToNavigate('primary')
  await reachEvidenceCamera()
  await injectScanTarget(scanTarget)
  // The scanner must read the card BEFORE the shutter: UsePhoto only asks the backend when a serial
  // AND a licence were already captured off the live frame stream. Nothing on screen reports a read,
  // so the dwell is blind — see Timeouts.CARD_SCAN_DWELL.
  await driver.pause(Timeouts.CARD_SCAN_DWELL)
  await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter — NOT tapToNavigate (not idempotent)
  await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // UsePhoto fires the /device/barcodes round trip. Plain tap, never tapToNavigate — its retry would
  // re-submit the authorization while the first is still in flight.
  await PhotoReviewScreen.tap('primary')
}

/**
 * Wait out the `/device/barcodes` round trip that {@link presentBcscCardAsEvidence}'s UsePhoto starts,
 * until `hasRerouted` reports the card's own setup flow on screen.
 *
 * Where the reroute lands depends on the card process the backend returns, so the caller supplies the
 * probe. Dropping back into the capture flow is called out separately from a timeout: it means the
 * live scanner never read the card, so the app never asked about it — a different fault entirely from
 * a slow or mismatched backend.
 */
export async function expectEvidenceReroute(hasRerouted: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + Timeouts.CARD_SCAN
  for (;;) {
    if (await hasRerouted()) return
    if ((await EvidenceCaptureScreen.isPresent(500)) || (await EvidenceIDCollectionScreen.isPresent(500))) {
      throw new Error(
        'The injected card was captured as ordinary evidence: its barcodes were never read off the live ' +
          'frame stream, so the app never asked /device/barcodes about them. Card barcodes only scan from ' +
          'injection on Android; check the asset still carries a decodable serial + AAMVA pair.'
      )
    }
    if (Date.now() > deadline) {
      throw new Error(
        `No reroute out of evidence capture within ${Timeouts.CARD_SCAN / 1000}s. ` +
          `On screen: ${await describeCurrentScreen()}`
      )
    }
    await driver.pause(1_000)
  }
}

/**
 * Non-photo BCSC "additional ID", step one: open the photo-ID list from AdditionalIdentificationRequired.
 * Separate from the capture, and re-callable, because backing out of the list's non-photo escape hatch
 * lands here again.
 */
export async function reachAdditionalPhotoIdList(): Promise<void> {
  // Wait for the unique heading first — otherwise a lingering `Continue` from the previous screen gets
  // tapped mid-transition.
  await $(additionalIdHeadingSelector()).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await AdditionalIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList
}

/** AdditionalIdentificationRequired's heading. Its only testID is the generic `Continue` (shared by
 *  ~10 screens), so the copy is the only thing that identifies the screen. */
function additionalIdHeadingSelector(): string {
  return driver.isIOS
    ? '-ios predicate string:label CONTAINS "provide additional ID"'
    : 'android=new UiSelector().textContains("provide additional ID")'
}

/** Non-throwing probe for AdditionalIdentificationRequired — for callers choosing between landings. */
export async function isAdditionalIdentificationRequired(): Promise<boolean> {
  return $(additionalIdHeadingSelector())
    .isDisplayed()
    .catch(() => false)
}

/**
 * Non-photo BCSC "additional ID", step two: pick the ID type and capture it, stopping ON the typed
 * EvidenceIDCollection form — the number is submitted separately by {@link submitEvidenceIdCollection},
 * and that gap is itself a resumable state. `evidenceMatch` is a case-insensitive substring of the
 * target row's testID (e.g. `'Passport'`). Camera-only via {@link capturePhotoIdDocument}.
 */
export async function captureAdditionalPhotoId(
  user: TestUser,
  evidenceMatch: string,
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await selectEvidenceType(evidenceMatch)
  // The card-back template carries the SIT combo barcode; the scanner runs behind every capture, so mask
  // it even though the reroute has only been observed in the non-BCSC flow.
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS, options)
}

/**
 * Fill an EvidenceIDCollection form — document number, plus (first non-BCSC ID only) name + birthdate —
 * then Continue. Every field is re-typed from scratch, so this is re-callable after a rejected submit.
 */
export async function submitEvidenceIdCollection(
  documentNumber: string,
  personalInfo?: { lastName: string; firstName: string; dob: string }
): Promise<void> {
  await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EvidenceIDCollectionScreen.fill('documentNumber', documentNumber, { tapFirst: true })
  if (personalInfo) {
    await EvidenceIDCollectionScreen.fill('lastName', personalInfo.lastName, { tapFirst: true })
    await EvidenceIDCollectionScreen.fill('firstName', personalInfo.firstName, { tapFirst: true })
    await EvidenceIDCollectionScreen.fill('birthdate', personalInfo.dob, { tapFirst: true })
  }
  await engine.dismissKeyboard()
  await EvidenceIDCollectionScreen.tapWhenEnabled('primary') // EvidenceIDCollectionContinue
}

/**
 * Enter the non-BCSC branch: `OtherID` → DualIdentificationRequired → the first-ID EvidenceTypeList.
 * OtherID discards any serial already entered, so this is a one-way turn off the BCSC path.
 *
 * Stops AT the list, committing no document — the cheap way to reach the evidence screens.
 */
export async function chooseOtherIdPath(): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('secondary') // OtherID → DualIdentificationRequired

  await expectDualIdentificationRequired()
  // Confirm-and-retry is safe on the generic `Continue` here: EvidenceTypeList renders no Continue of
  // its own, so the button going away means the push landed.
  await DualIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList (first ID)
}

/**
 * Assert arrival on DualIdentificationRequired — reached by choosing OtherID, and also by the serial
 * scanner reading a code it cannot resolve to a BC Services Card.
 *
 * The screen's only CTA is the generic `Continue` (shared by ~10 screens), so its heading copy is the
 * only distinguishing marker.
 */
export async function expectDualIdentificationRequired(timeoutMs: number = Timeouts.SCREEN_TRANSITION): Promise<void> {
  const selector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "two government"'
    : 'android=new UiSelector().textContains("two government")'
  await $(selector).waitForDisplayed({ timeout: timeoutMs })
}

/**
 * Non-BCSC first ID: OtherID → list → pick → capture, stopping ON the typed form (which also collects
 * name + birthdate). `docMatch` is a case-insensitive substring of the target row's testID.
 *
 * The card-back image carries the SIT combo barcode, and this is the flow that reroutes on a scan — so
 * those regions are masked out of the injection.
 */
export async function captureFirstNonBcscDocument(user: TestUser, docMatch: string): Promise<void> {
  if (user.flow !== 'non-bcsc') {
    throw new Error(`captureFirstNonBcscDocument requires a non-bcsc TestUser (got '${user.flow}')`)
  }
  await chooseOtherIdPath()
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS)
}

/**
 * Non-BCSC second ID: pick → capture, stopping ON its typed form. Submitting that form (number only)
 * resumes to ResidentialAddress. The list differs from the first document's — the screen filters by
 * `collection_order` and hides what was already chosen.
 */
export async function captureSecondNonBcscDocument(user: TestUser, docMatch: string): Promise<void> {
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.selfieImage)
}

/**
 * Fill the ResidentialAddress form (non-BCSC only) → the mandatory email step. Province is a dropdown:
 * tap to open the modal, then pick British Columbia.
 *
 * Nothing here may dismiss the keyboard positionally — the province dropdown sits under the old blind
 * tap point, which is why {@link BaseScreen.dismissKeyboard} no longer uses one on iOS.
 */
export async function fillResidentialAddress(): Promise<void> {
  await ResidentialAddressScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.fill('streetAddress1', '123 Main St', { tapFirst: true })
  await ResidentialAddressScreen.fill('city', 'Victoria', { tapFirst: true })
  await engine.dismissKeyboard()

  await ResidentialAddressScreen.link('province')
  await ResidentialAddressScreen.waitFor('provinceBC', Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.link('provinceBC')
  await expectProvinceDropdownClosed()

  await ResidentialAddressScreen.fill('postalCode', 'V8W 2Y2', { tapFirst: true })
  await engine.dismissKeyboard()
  await ResidentialAddressScreen.tapWhenEnabled('primary') // ResidentialAddressContinue
}

/**
 * Wait for the province modal to close — the BC option only exists inside it. Asserted explicitly so a
 * swallowed option tap is named here, not later as an unreachable postal-code field.
 */
async function expectProvinceDropdownClosed(): Promise<void> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  do {
    if (!(await ResidentialAddressScreen.isVisible('provinceBC'))) return
    await driver.pause(250)
  } while (Date.now() < deadline)
  throw new Error('The province dropdown did not close after selecting British Columbia')
}
