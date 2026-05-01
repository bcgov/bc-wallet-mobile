/**
 * Step 5 → VerificationMethodSelection.Help (WebView) and the VideoCall side
 * of the verification method picker: BeforeYouCall.Help, BeforeYouCall.Assistance.
 * Stops short of StartCall (which would dial out) and backs out to SetupSteps.
 *
 * Pre: SetupSteps with Step 5 ready. Post: SetupSteps anchor.
 */
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { swipeDownBy, swipeUpBy } from '../../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const BeforeYouCall = new BaseScreen(BCSC_TestIDs.BeforeYouCall)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const InformationRequired = new BaseScreen(BCSC_TestIDs.InformationRequired)
const PhotoInstructions = new BaseScreen(BCSC_TestIDs.PhotoInstructions)
const TakePhoto = new BaseScreen(BCSC_TestIDs.TakePhoto)
const PhotoReview = new BaseScreen(BCSC_TestIDs.PhotoReview)
const VideoInstructions = new BaseScreen(BCSC_TestIDs.VideoInstructions)
const TakeVideo = new BaseScreen(BCSC_TestIDs.TakeVideo)
const VideoReview = new BaseScreen(BCSC_TestIDs.VideoReview)
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

describe('VideoReview interactions', () => {
  it('enters Step 5 → SendVideo → captures selfie photo', async () => {
    await SetupSteps.waitFor('Step5')
    await SetupSteps.tap('Step5')
    await VerificationMethodSelection.waitFor('SendVideo')
    await VerificationMethodSelection.tap('SendVideo')
    await InformationRequired.waitFor('TakePhotoAction')
    await InformationRequired.tap('TakePhotoAction')
    await PhotoInstructions.waitFor('TakePhotoButton')
    await PhotoInstructions.tap('TakePhotoButton')
    await TakePhoto.waitFor('TakePhoto')
    await TakePhoto.tap('TakePhoto')
    await PhotoReview.waitFor('UsePhoto')
    await PhotoReview.tap('UsePhoto')
  })

  it('records the video and lands on VideoReview', async () => {
    await InformationRequired.waitFor('RecordVideoAction')
    await InformationRequired.tap('RecordVideoAction')
    swipeUpBy(0.5) // scroll to the bottom of the instructions
    await VideoInstructions.waitFor('StartRecordingButton')
    await VideoInstructions.tap('StartRecordingButton')
    await acceptSystemAlert()
    for (let i = 0; i < 3; i++) {
      await TakeVideo.waitForEnabledAndTap('StartRecordingButton')
    }
    await VideoReview.waitFor('UseVideo')
  })

  it('toggles play/pause on the preview', async () => {
    await VideoReview.tap('TogglePlayPause')
    await VideoReview.tap('TogglePlayPause')
  })

  it('retakes the video and re-lands on VideoReview', async () => {
    await VideoReview.tap('RetakeVideo')
    for (let i = 0; i < 3; i++) {
      await TakeVideo.waitForEnabledAndTap('StartRecordingButton')
    }
    await VideoReview.waitFor('UseVideo')
  })

  it('backs out to SetupSteps without sending', async () => {
    await VideoReview.tap('UseVideo')
    await InformationRequired.waitFor('Back')
    await InformationRequired.tap('Back')
    await VerificationMethodSelection.waitFor('Back')
    await VerificationMethodSelection.tap('Back')
    await SetupSteps.waitFor('Step5')
  })
})
