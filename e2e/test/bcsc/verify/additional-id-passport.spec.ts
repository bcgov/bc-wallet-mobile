import { injectPhoto } from '../../../src/helpers/camera.js'
import { acceptCameraPermissionIfPresent } from '../../../src/helpers/notifications.js'
import { isSauceLabs } from '../../../src/helpers/sauce.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { verifyContext } from './card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const AdditionalIdentificationRequired = new BaseScreen(BCSC_TestIDs.AdditionalIdentificationRequired)
const EvidenceTypeList = new BaseScreen(BCSC_TestIDs.EvidenceTypeList)
const EvidenceCapture = new BaseScreen(BCSC_TestIDs.EvidenceCapture)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)
const PhotoReview = new BaseScreen(BCSC_TestIDs.PhotoReview)

describe('Additional Identification', () => {
  it('should click step 2 again to add additional identification', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Additional Identification Required screen and tap Choose ID', async () => {
    await AdditionalIdentificationRequired.waitFor('ChooseID')
    await AdditionalIdentificationRequired.tap('ChooseID')
  })

  it('should navigate through the Evidence Type List screen and tap Canadian Passport', async () => {
    await EvidenceTypeList.waitFor('CanadianPassport')
    await EvidenceTypeList.tap('CanadianPassport')
  })

  it('should navigate through the ID Photo Information screen and take a photo', async () => {
    await IDPhotoInformation.waitFor('TakePhoto')
    await IDPhotoInformation.tap('TakePhoto')
    await acceptCameraPermissionIfPresent()
  })

  it('should navigate through the Evidence Capture screen and take a photo', async () => {
    if (isSauceLabs()) {
      await injectPhoto('/images/passport.jpg')
    } else {
      await EvidenceCapture.waitFor('TakePhoto')
      await EvidenceCapture.tap('TakePhoto')
    }
  })

  it('should navigate through the Photo Review screen and tap Use Photo', async () => {
    await PhotoReview.waitFor('UsePhoto')
    await PhotoReview.tap('UsePhoto')
  })

  it('should navigate through the Evidence ID Collection screen and fill in the Document Number', async () => {
    const { testUser } = verifyContext
    await EvidenceIDCollection.waitFor('DocumentNumberPressable')
    await EvidenceIDCollection.type('DocumentNumberPressable', testUser.documentNumber)
    await EvidenceIDCollection.dismissKeyboard()
    await EvidenceIDCollection.tap('Continue')
  })
})
