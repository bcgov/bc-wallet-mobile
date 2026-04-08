import { acceptSystemAlert } from '../../../src/helpers/alerts.js'
import { injectPhoto } from '../../../src/helpers/camera.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { getVerifyContext } from './card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const InformationRequired = new BaseScreen(BCSC_TestIDs.InformationRequired)
const PhotoInstructions = new BaseScreen(BCSC_TestIDs.PhotoInstructions)
const TakePhoto = new BaseScreen(BCSC_TestIDs.TakePhoto)
const PhotoReview = new BaseScreen(BCSC_TestIDs.PhotoReview)
const VideoInstructions = new BaseScreen(BCSC_TestIDs.VideoInstructions)
const TakeVideo = new BaseScreen(BCSC_TestIDs.TakeVideo)
const VideoReview = new BaseScreen(BCSC_TestIDs.VideoReview)
const SuccessfullySent = new BaseScreen(BCSC_TestIDs.SuccessfullySent)

const { testUser } = getVerifyContext()
const { selfieImage } = testUser

describe('Send Video Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupSteps.waitFor('Step5', 10_000)
    await SetupSteps.tap('Step5')
  })

  it('should navigate through the Verification Method Selection screen and tap Send Video', async () => {
    await VerificationMethodSelection.waitFor('SendVideo')
    await VerificationMethodSelection.tap('SendVideo')
  })

  it('should navigate through the Information Required screen and tap Take Photo', async () => {
    await InformationRequired.waitFor('TakePhotoAction')
    await InformationRequired.tap('TakePhotoAction')
  })

  it('should navigate through the Photo Instructions screen and tap Take Photo', async () => {
    await PhotoInstructions.waitFor('TakePhotoButton')
    await injectPhoto(selfieImage, { top: 0, right: 0, bottom: 0, left: 0 })
    await PhotoInstructions.tap('TakePhotoButton')
    await acceptSystemAlert()
  })

  it('should navigate through the Take Photo screen and tap Take Photo', async () => {
    await TakePhoto.waitFor('TakePhoto')
    await TakePhoto.tap('TakePhoto')
  })

  it('should navigate through the photo review screen and tap Use Photo', async () => {
    await PhotoReview.waitFor('UsePhoto')
    await PhotoReview.tap('UsePhoto')
  })

  it('should navigate through the information required screen and tap Record Video', async () => {
    await InformationRequired.waitFor('RecordVideoAction')
    await InformationRequired.tap('RecordVideoAction')
  })

  it('should navigate through the Video Instructions screen and tap Record Video', async () => {
    await VideoInstructions.waitFor('StartRecordingButton')
    await injectPhoto(selfieImage, { top: 0, right: 0, bottom: 0, left: 0 })
    await VideoInstructions.tap('StartRecordingButton')
    await acceptSystemAlert()
  })

  it('should navigate through the Take Video screen and tap Take Video', async () => {
    await TakeVideo.waitFor('StartRecordingButton')
    await TakeVideo.tap('StartRecordingButton')
  })

  it('should navigate through the Take Video screen and tap next prompt button 3 times', async () => {
    for (let i = 0; i < 3; i++) {
      await TakeVideo.waitForEnabledAndTap('StartRecordingButton')
    }
  })

  it('should navigate through the Video Review screen and tap Use Video', async () => {
    await VideoReview.waitFor('UseVideo')
    await VideoReview.tap('UseVideo')
  })

  it('should navigate through the information required screen and tap Send to Service BC Now', async () => {
    await InformationRequired.waitFor('SendToServiceBCNow')
    await InformationRequired.tap('SendToServiceBCNow')
  })

  it('should navigate through the Successfully Sent screen and tap Ok', async () => {
    await SuccessfullySent.waitFor('Ok')
    await SuccessfullySent.tap('Ok')
  })

  it('Affirm that the Setup Steps screen is displayed', async () => {
    await SetupSteps.waitFor('Step5')
  })
})
