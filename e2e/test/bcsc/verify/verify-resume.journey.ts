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
import { HomeNotificationCard, HomeScreen } from '../../../src/screens/main.js'
import { AccountSetupScreen, EnterBirthdateScreen, IDPhotoInformationScreen } from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** The first-ID list row to select but never capture — the same slot the non-BCSC journey proves. */
const INTERRUPTED_EVIDENCE_MATCH = 'BC Drivers Licence'

/**
 * Verify journey: resume routing — what `getResumeStepRoute` puts on screen when a user comes BACK to
 * an unfinished verification. That mapping drives the verify stack's initial route and every
 * step-completion navigation, and none of it was covered.
 *
 * The route back in is always the same and is worth stating, because it is not the obvious one: the
 * verification-in-progress flag is in-memory and hydration recomputes it from the credential, so
 * leaving the flow AND every relaunch land on Home, where the Start/Continue-verification notification
 * card is the only way back into the stack. Each checkpoint therefore leaves, returns, and asserts
 * which step the app chose.
 *
 * Deliberately cheap: no verification is completed and no camera is used. The serial is saved but never
 * submitted (no `authorizeDevice`), and the interrupted-capture state is reached by selecting an ID and
 * stopping — the app persists that selection with zero photos, which is exactly its "capture was
 * interrupted" state. Backend traffic is the terms fetch, the evidence-type list, and the IAS
 * re-registration that Restart performs.
 *
 * Two rows of the resume matrix are NOT here because they cost a full verification: the captured-but-
 * unnumbered document (→ EvidenceIDCollection) and the post-authorize steps (→ ResidentialAddress /
 * EnterEmail / VerificationMethodSelection). They belong on the journeys that already pay for that
 * state. The video-submitted row (→ PendingReview) needs a submitted video, which CI cannot produce.
 *
 * ORDER MATTERS: the serial and the interrupted capture are mutually exclusive resume states (a serial
 * only routes to EnterBirthdate while no card process is set, and choosing Other ID sets one), so the
 * serial rows run first and Restart is what clears them for the evidence rows.
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
    // Progress is kept, so Home offers the verification card. Which variant it is (Start vs Continue)
    // depends on whether the ID step is complete — it is not here — and both re-enter the same way.
    await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('resumes onto the birthdate step, since a serial is saved', async () => {
    await resumeVerification()
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('leaves again via the resumed step back button, which has nothing to pop', async () => {
    // Resuming makes EnterBirthdate the stack's INITIAL route, so its back button has no destination.
    // Rather than being dead it leaves the flow (VerifyResumeHeaderBackButton) — the same exit as the
    // help menu, and the reason those screens carry a custom header-left at all.
    await EnterBirthdateScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('still resumes onto the birthdate step after a relaunch', async () => {
    // A relaunch is the case the in-memory flag cannot cover: the serial has to survive in native
    // storage AND hydration has to recompute the step. Landing on Home (not the verify stack) is part
    // of the assertion — `unlockWithPin` requires it.
    await unlockWithPin(TEST_PIN, { relaunch: true })
    await resumeVerification()
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('stays on the birthdate step when the restart confirmation is cancelled', async () => {
    await restartVerification('cancel')
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('wipes progress when the restart is confirmed, reopening on the setup question', async () => {
    await restartVerification('confirm')
    // Restart clears the recorded setup type as well as the verification data, so the flow reopens on
    // the add-or-transfer question — NOT on IdentitySelection, which is where the serial branch began.
    // The wait is generous: the reset deletes and recreates the IAS registration behind a loading screen.
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
    // A selected ID with no photos resumes to the primer so capture restarts from the first side,
    // rather than dropping the user on the document-number form or back at the start of the ID step.
    // Nothing else could produce this route here: Restart wiped the serial, and choosing Other ID set
    // the non-BCSC card process, so the interrupted capture is the only progress left to resume.
    await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
