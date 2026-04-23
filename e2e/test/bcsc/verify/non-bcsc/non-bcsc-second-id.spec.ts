import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'
import { getVerifyContext } from '../card-type/card-context.js'

const context = getVerifyContext()

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)
const EvidenceCapture = new BaseScreen(BCSC_TestIDs.EvidenceCapture)
const EvidenceFormData = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)

describe(`Non-BCSC Card (2) - Passport`, () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.tap('Step2')
  })

  it('should select the passport option', async () => {
    await EvidenceIDCollection.tap('PassportEvidenceOption')
  })

  it('should navigate to photo capture screen', async () => {
    await IDPhotoInformation.tap('TakePhoto')
  })

  it('should capture the front of the passport', async () => {
    await EvidenceCapture.tap('TakePhoto')
    await EvidenceCapture.tap('UsePhoto')
  })

  it('should enter in the correct form data', async () => {
    await EvidenceFormData.type('DocumentNumberInput', context.testUser.documentNumber)
    await EvidenceFormData.tap('Continue')
  })
})
