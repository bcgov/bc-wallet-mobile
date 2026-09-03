import assert from 'node:assert/strict'
import { TEST_PIN, TestUsers, Timeouts } from '../../../src/constants.js'
import { unlockWithPin } from '../../../src/flows/auth.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  chooseOtherIdPath,
  enterSerialManually,
  leaveVerificationToHome,
  restartVerification,
  resumeVerification,
  selectEvidenceType,
  startVerification,
} from '../../../src/flows/verify.js'
import { CUSTOM_CARD_COPY } from '../../../src/helpers/notifications.js'
import { HomeNotificationCard, HomeScreen } from '../../../src/screens/main.js'
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
 * Verify journey: resume routing — what `getResumeStepRoute` puts on screen when a user comes BACK to an
 * unfinished verification. That mapping drives the verify stack's initial route and every step-completion
 * navigation, and none of it was covered.
 *
 * Leaving the flow lands on Home, whose verification card is the route back in (the in-progress flag is
 * in-memory); a relaunch resumes a user who chose to verify straight onto the step. Each checkpoint
 * leaves, returns, and asserts which step the app chose.
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

  it('saves a card serial and stops on the birthdate step', async () => {
    await startVerification()
    await chooseAddAccount()
    // Stops at EnterBirthdate WITHOUT submitting: the serial is persisted, the card is not authorized.
    await enterSerialManually(getTestUser())
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('leaves verification for home and offers a way back in', async () => {
    await leaveVerificationToHome()
    // Progress is kept, so Home offers the verification card; both variants re-enter the same way.
    await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Precedence boundary (runtime-confirmed): a SAVED-but-unsubmitted serial does NOT flip the card —
    // the Continue variant needs the id step COMPLETED (authorize), so this still renders Start. The
    // variants share their title; body/button are what tell them apart. (Continue itself is asserted
    // post-authorize on the combined journey.)
    assert.equal(await HomeNotificationCard.read('body'), CUSTOM_CARD_COPY.start.body)
    assert.equal(await HomeNotificationCard.read('button'), CUSTOM_CARD_COPY.start.button)
  })

  it('resumes onto the birthdate step, since a serial is saved', async () => {
    await resumeVerification()
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('backs out of the resumed birthdate step via IdentitySelection', async () => {
    // Resuming makes EnterBirthdate the stack's INITIAL route. Its back no longer leaves the flow:
    // with nothing to pop it REPLACES to IdentitySelection — whose own back (now the initial route)
    // is what leaves to Home, progress kept.
    await EnterBirthdateScreen.back.tap()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await IdentitySelectionScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('still resumes onto the birthdate step after a relaunch', async () => {
    // A relaunch is what the in-memory flag cannot cover: the serial must survive in native storage and
    // hydration must recompute the step. The unlock lands straight on it (the app resumes a user who
    // chose to verify) or on Home, whose card is the other way in — so the landing is left open.
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
