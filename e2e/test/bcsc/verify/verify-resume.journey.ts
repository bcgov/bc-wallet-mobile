import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  chooseOtherIdPath,
  enterSerialManually,
  expectNoBackToHome,
  leaveVerificationToHome,
  restartVerification,
  resumeVerification,
  selectEvidenceType,
  startVerification,
} from '../../../src/flows/verify.js'
import { navigateBack } from '../../../src/helpers/gestures.js'
import { CUSTOM_CARD_COPY } from '../../../src/helpers/notifications.js'
import { HomeNotificationCard, HomeScreen } from '../../../src/screens/main.js'
import { VerifyPromptScreen } from '../../../src/screens/onboarding.js'
import {
  AccountSetupScreen,
  EnterBirthdateScreen,
  IdentitySelectionScreen,
  IDPhotoInformationScreen,
} from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** The first-ID list row to select but never capture — the same slot the non-BCSC journey proves. */
const INTERRUPTED_EVIDENCE_MATCH = 'BC Drivers Licence'

/**
 * Verify journey: resume routing and the exits of the verify stack — which step `getResumeStepRoute`
 * puts on screen when a user comes BACK to an unfinished verification, and which ways out of the flow
 * each kind of user is offered (#4776).
 *
 * The onboarding prompt decides the kind for the rest of the account's life. Continue makes a FIRST-TIME
 * verifier: no "Back to home", and the back arrow at the beginning of the stack returns to the prompt,
 * which has no arrow and swallows hardware back. Skip makes a DEFERRED verifier, who keeps every exit and
 * re-enters from the Home card. Only a factory reset clears the answer, so one session covers both kinds
 * by starting as a first-time verifier and skipping from the prompt it walked back to. Anyone who has
 * started resumes on a relaunch, skipped or not.
 *
 * Deliberately cheap — nothing is verified and no camera is used. The serial is saved but never submitted
 * (no `authorizeDevice`), and the interrupted capture is a selected ID with zero photos, which the app
 * persists as exactly that state.
 *
 * The rows costing a full verification (captured-but-unnumbered document, the post-authorize steps) live
 * on the journeys already paying for that state; the video-submitted row needs a video CI cannot produce.
 *
 * ORDER MATTERS: a saved serial and an interrupted capture are mutually exclusive resume states (choosing
 * Other ID sets a card process, which retires the serial route), so the serial rows run first and Restart
 * is what clears them for the evidence rows.
 */
describe('Verify journey: resume routing', () => {
  before(() => {
    setTestUser(TestUsers.photo)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('offers no way back from the verify prompt', async () => {
    // The prompt is the root of the flow: no arrow, and the OS back affordance is swallowed
    assert.equal(await VerifyPromptScreen.isVisible('backArrow'), false)
    await navigateBack()
    await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('starts verification as a first-time verifier, with no Back to home on offer', async () => {
    await startVerification()
    await expectNoBackToHome()
  })

  it('returns to the verify prompt from the first step, then continues again', async () => {
    // Continue PUSHED the setup question over the prompt, so back pops to it...
    await AccountSetupScreen.back.tapToReach(VerifyPromptScreen)
    assert.equal(await VerifyPromptScreen.isVisible('backArrow'), false)
    // ...and Continue pushes the resume step — still the setup question, nothing having been chosen yet
    await VerifyPromptScreen.tapToReach('primary', AccountSetupScreen)
  })

  it('saves a card serial and stops on the birthdate step', async () => {
    await chooseAddAccount()
    // Stops at EnterBirthdate WITHOUT submitting: the serial is persisted, the card is not authorized.
    await enterSerialManually(getTestUser())
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resumes straight onto the birthdate step after a relaunch', async () => {
    // The serial must survive in native storage and hydration must recompute the step. A first-time
    // verifier is resumed by the app itself and never shown Home, so the landing is asserted outright.
    await unlockWithPin(TEST_PIN, { relaunch: true, landing: 'any' })
    await EnterBirthdateScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('walks back from the resumed step to the verify prompt, still with no way home', async () => {
    // Resuming makes EnterBirthdate the stack's INITIAL route: its back REPLACES to IdentitySelection,
    // whose own back (nothing beneath) replaces to the prompt for a first-time verifier — progress kept,
    // since a replace is not the pop that resets the registration.
    await EnterBirthdateScreen.back.tap()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await IdentitySelectionScreen.back.tapToReach(VerifyPromptScreen)
    assert.equal(await VerifyPromptScreen.isVisible('backArrow'), false)
    await expectNoBackToHome()
  })

  it('skips from the prompt, landing on Home with the Start card as a deferred verifier', async () => {
    // Skip is the one way to Home, and it changes the kind of user for good: from here on every exit is offered.
    await VerifyPromptScreen.tapToReach('secondary', HomeScreen)
    await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Precedence boundary (runtime-confirmed): a SAVED-but-unsubmitted serial does NOT flip the card —
    // the Continue variant needs the id step COMPLETED (authorize), so this still renders Start. The
    // variants share their title; body/button are what tell them apart. (Continue itself is asserted
    // post-authorize on the combined journey.)
    assert.equal(await HomeNotificationCard.read('body'), CUSTOM_CARD_COPY.start.body)
    assert.equal(await HomeNotificationCard.read('button'), CUSTOM_CARD_COPY.start.button)
  })

  it('resumes onto the birthdate step from the Home card, now able to leave for Home', async () => {
    await resumeVerification()
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Every exit relies on the root stack swapping to Home once the in-progress flag drops. A session the
    // app resumed itself is where that swap has silently failed before, so it is asserted here on its own.
    await leaveVerificationToHome()
  })

  it('backs out of the resumed birthdate step to Home via IdentitySelection', async () => {
    await resumeVerification()
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await EnterBirthdateScreen.back.tap()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Now the initial route, and a deferred verifier: back leaves to Home, progress kept.
    await IdentitySelectionScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('still resumes onto the birthdate step after a relaunch, skipped or not', async () => {
    // Started verification is what a relaunch resumes, whether or not the prompt was skipped. The unlock
    // lands straight on the step or on Home, whose card is the other way in — so the landing is left open.
    await unlockWithPin(TEST_PIN, { relaunch: true, landing: 'any' })
    await resumeVerification(EnterBirthdateScreen, Timeouts.APP_LAUNCH)
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('stays on the birthdate step when the restart confirmation is cancelled', async () => {
    await restartVerification('cancel')
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('wipes progress when the restart is confirmed, reopening on the setup question', async () => {
    await restartVerification('confirm')
    // Restart clears the recorded setup type too, so the flow reopens on the add-or-transfer question,
    // NOT IdentitySelection. The generous wait covers the IAS re-registration behind its loading screen.
    await AccountSetupScreen.expectVisible(Timeouts.APP_LAUNCH)
  })

  it('selects an ID and stops before capturing it', async () => {
    await chooseAddAccount()
    await chooseOtherIdPath()
    await selectEvidenceType(INTERRUPTED_EVIDENCE_MATCH)
    await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resumes an interrupted capture onto the photo primer', async () => {
    await leaveVerificationToHome()
    await resumeVerification()
    // A selected ID with no photos resumes to the primer, so capture restarts from the first side rather
    // than dropping the user on the number form or back at the start of the ID step.
    await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
