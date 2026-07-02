/**
 * VideoCall side of the verification method picker.
 *
 * Tapping "Video call" routes to one of two destinations depending on live-call
 * availability (see `handlePressLiveCall` in
 * app/src/bcsc-theme/features/verify/_models/useVerificationMethodModel.tsx):
 *   - CallBusyOrClosed — when the video queue is empty, the current time is
 *     outside service hours, or the service-hours API errors. The nightly hits
 *     this branch because it runs at 00:00 PT (outside service hours).
 *   - PhotoInstructions — when a live call is available (within service hours).
 *
 * This spec branches on whichever destination the app actually shows so it
 * passes regardless of when it runs, and backs out to SetupSteps without dialing
 * out (it never advances past the destination into StartCall/LiveCall).
 *
 * Pre: SetupSteps with Step 5 ready. Post: SetupSteps anchor.
 */
import { Timeouts } from '../../../../src/constants.js'
import { navigateBack } from '../../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const CallBusyOrClosed = new BaseScreen(BCSC_TestIDs.CallBusyOrClosed)
const PhotoInstructions = new BaseScreen(BCSC_TestIDs.PhotoInstructions)

describe('VerificationMethod + VideoCall detour', () => {
  it('enters Step 5 → VerificationMethodSelection', async () => {
    await SetupSteps.waitFor('Step5')
    await SetupSteps.tap('Step5')
    await VerificationMethodSelection.waitFor('VideoCall')
  })

  it('routes Video call to the destination for the current service hours', async () => {
    await VerificationMethodSelection.tap('VideoCall')

    // The destination depends on real-time service hours / queue state, so wait
    // for whichever screen the app renders rather than assuming one. The tap
    // kicks off a service-hours API call before navigating, hence the longer
    // transition timeout.
    let onCallBusyOrClosed = false
    await driver.waitUntil(
      async () => {
        onCallBusyOrClosed = await CallBusyOrClosed.isDisplayed('CallStatusTitle')
        if (onCallBusyOrClosed) {
          return true
        }
        return PhotoInstructions.isDisplayed('TakePhotoButton')
      },
      {
        timeout: Timeouts.SCREEN_TRANSITION,
        timeoutMsg: 'After tapping Video call, neither CallBusyOrClosed nor PhotoInstructions appeared',
      }
    )

    if (onCallBusyOrClosed) {
      // Outside service hours / no queue available — closed-or-busy screen.
      await CallBusyOrClosed.waitFor('CallStatusTitle')
    } else {
      // Within service hours — live-call photo-instructions screen.
      await PhotoInstructions.waitFor('TakePhotoButton')
    }
  })

  it('backs out to SetupSteps without dialing out', async () => {
    // Neither destination exposes an in-app back control, and
    // VerificationMethodSelection shows a settings menu in place of a back
    // arrow, so pop each frame with the platform-native back affordance.
    await navigateBack() // destination → VerificationMethodSelection
    await VerificationMethodSelection.waitFor('VideoCall')
    await navigateBack() // VerificationMethodSelection → SetupSteps
    await SetupSteps.waitFor('Step5')
  })
})
