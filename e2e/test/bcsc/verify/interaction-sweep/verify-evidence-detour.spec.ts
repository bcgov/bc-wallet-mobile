/**
 * Re-enters Step 2 (additional ID) and exercises EvidenceTypeList side interactions:
 * OtherOptions list and Help WebView. Pre: SetupSteps with Step 2 needing
 * additional ID. Post: SetupSteps anchor.
 */
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const AdditionalIdentificationRequired = new BaseScreen(BCSC_TestIDs.AdditionalIdentificationRequired)
const EvidenceTypeList = new BaseScreen(BCSC_TestIDs.EvidenceTypeList)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)
const EvidenceCapture = new BaseScreen(BCSC_TestIDs.EvidenceCapture)
const PhotoReview = new BaseScreen(BCSC_TestIDs.PhotoReview)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)

describe('EvidenceTypeList interactions', () => {
  it('enters Step 2 → AdditionalIdentificationRequired → EvidenceTypeList', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
    await AdditionalIdentificationRequired.waitFor('ChooseID')
    await AdditionalIdentificationRequired.tap('ChooseID')
    await EvidenceTypeList.waitFor('Help')
  })

  it('opens the help WebView', async () => {
    await EvidenceTypeList.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('opens OtherOptions and returns to SetupSteps', async () => {
    await EvidenceTypeList.waitFor('OtherOptions')
    await EvidenceTypeList.tap('OtherOptions')
    await EvidenceTypeList.waitFor('Back')
    await EvidenceTypeList.tap('Back')
    await AdditionalIdentificationRequired.waitFor('Back')
    await AdditionalIdentificationRequired.tap('Back')
    await SetupSteps.waitFor('Step2')
  })
})

describe('EvidenceCapture interactions', () => {
  it('enters Step 2 → AdditionalIdentificationRequired → EvidenceTypeList → IDPhotoInformation', async () => {
    await SetupSteps.tap('Step2')
    await AdditionalIdentificationRequired.waitFor('ChooseID')
    await AdditionalIdentificationRequired.tap('ChooseID')
    await EvidenceTypeList.waitFor('CanadianPassport')
    await EvidenceTypeList.tap('CanadianPassport')
    await IDPhotoInformation.waitFor('Help')
  })

  it('opens IDPhotoInformation Help WebView and returns', async () => {
    await IDPhotoInformation.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await IDPhotoInformation.waitFor('TakePhoto')
  })

  it('opens the camera', async () => {
    await IDPhotoInformation.tap('TakePhoto')
    await acceptSystemAlert()
    await EvidenceCapture.waitFor('TakePhoto')
  })

  it('toggles flash on then off', async () => {
    await EvidenceCapture.tap('ToggleFlash')
    await EvidenceCapture.tap('ToggleFlash')
  })

  it('takes a photo, retakes, and returns to the camera', async () => {
    await EvidenceCapture.tap('TakePhoto')
    await PhotoReview.waitFor('RetakePhoto')
    await PhotoReview.tap('RetakePhoto')
    await EvidenceCapture.waitFor('TakePhoto')
  })

  it('opens EvidenceCapture Help WebView and returns', async () => {
    await EvidenceCapture.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await EvidenceCapture.waitFor('TakePhoto')
  })

  it('cancels the camera and confirms back to IDPhotoInformation', async () => {
    await EvidenceCapture.tap('CancelCamera')

    await IDPhotoInformation.waitFor('TakePhoto')
  })
})

describe('EvidenceIDCollection interactions', () => {
  it('enters Step 2 → ... → EvidenceIDCollection', async () => {
    await IDPhotoInformation.tap('TakePhoto')
    await EvidenceCapture.waitFor('TakePhoto')
    await EvidenceCapture.tap('TakePhoto')
    await PhotoReview.waitFor('UsePhoto')
    await PhotoReview.tap('UsePhoto')
    await EvidenceIDCollection.waitFor('Continue')
  })

  it('opens EvidenceIDCollection Help WebView and returns', async () => {
    await EvidenceIDCollection.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await EvidenceIDCollection.waitFor('Cancel')
  })

  it('cancels and returns to AdditionalIdentificationRequired', async () => {
    await EvidenceIDCollection.tap('Cancel')
    await EvidenceTypeList.waitFor('Back')
    await EvidenceTypeList.tap('Back')
  })

  it('returns to SetupSteps', async () => {
    await SetupSteps.waitFor('Step2')
  })
})
