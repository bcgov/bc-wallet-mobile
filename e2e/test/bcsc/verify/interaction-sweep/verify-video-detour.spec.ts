/**
 * Step 5 → VerificationMethodSelection.Help (WebView) and the VideoCall side
 * of the verification method picker: BeforeYouCall.Help, BeforeYouCall.Assistance.
 * Stops short of StartCall (which would dial out) and backs out to SetupSteps.
 *
 * The VideoReview recording detour (record / retake / play-pause) lives in
 * `verify/components/send-video-verification.spec.ts` because video capture
 * is unreliable on Sauce devices and is exercised only in the manual flow.
 *
 * Pre: SetupSteps with Step 5 ready. Post: SetupSteps anchor.
 */
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const BeforeYouCall = new BaseScreen(BCSC_TestIDs.BeforeYouCall)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const ContactUs = new BaseScreen(BCSC_TestIDs.ContactUs)

describe('VerificationMethod + VideoCall detour', () => {
  it('enters Step 5 → VerificationMethodSelection', async () => {
    await SetupSteps.waitFor('Step5')
    await SetupSteps.tap('Step5')
    await VerificationMethodSelection.waitFor('Help')
  })

  it('opens VerificationMethodSelection Help WebView and returns', async () => {
    await VerificationMethodSelection.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await VerificationMethodSelection.waitFor('VideoCall')
  })

  it('enters BeforeYouCall via VideoCall', async () => {
    await VerificationMethodSelection.tap('VideoCall')
    await BeforeYouCall.waitFor('Help')
  })

  it('opens BeforeYouCall Help WebView and returns', async () => {
    await BeforeYouCall.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await BeforeYouCall.waitFor('Assistance')
  })

  it('exercises BeforeYouCall.Assistance and returns', async () => {
    await BeforeYouCall.tap('Assistance')
    await ContactUs.waitFor('Back')
    await ContactUs.tap('Back')
    await BeforeYouCall.waitFor('Back')
  })

  it('backs out to SetupSteps without continuing the call', async () => {
    await BeforeYouCall.tap('Back')
    await VerificationMethodSelection.waitFor('Back')
    await VerificationMethodSelection.tap('Back')
    await SetupSteps.waitFor('Step5')
  })
})
