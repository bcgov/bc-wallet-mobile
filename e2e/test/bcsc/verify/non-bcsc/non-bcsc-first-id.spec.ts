import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'
import { getVerifyContext } from '../card-type/card-context.js'

const context = getVerifyContext()

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const DualIdentificationRequired = new BaseScreen(BCSC_TestIDs.DualIdentificationRequired)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)
const EvidenceCapture = new BaseScreen(BCSC_TestIDs.EvidenceCapture)
const EvidenceFormData = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)

describe(`Non-BCSC Card (1) - Drivers License`, () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    await IdentitySelection.tap(context.cardTypeButton)
  })

  it('should navigate to the evidence ID collection screen', async () => {
    await DualIdentificationRequired.tap('ChooseID')
  })

  it('should select the BC drivers licence option', async () => {
    await EvidenceIDCollection.tap('DriversLicenseEvidenceOption')
  })

  it('should navigate to photo capture screen', async () => {
    await IDPhotoInformation.tap('TakePhoto')
  })

  it('should capture the front of the BC drivers licence', async () => {
    await EvidenceCapture.tap('TakePhoto')
    await EvidenceCapture.tap('UsePhoto')
  })

  it('should capture the back of the BC drivers licence', async () => {
    await EvidenceCapture.tap('TakePhoto')
    await EvidenceCapture.tap('UsePhoto')
  })

  it('should enter in the correct form data', async () => {
    await EvidenceFormData.type('DocumentNumberPressable', context.testUser.documentNumber)
    await EvidenceFormData.type('LastNamePressable', context.testUser.lastName)
    await EvidenceFormData.type('FirstNamePressable', context.testUser.firstName)
    await EvidenceFormData.type('MiddleNamesPressable', 'Middle Names')
    await EvidenceFormData.type('BirthdatePressable', context.testUser.dob)
    await EvidenceFormData.tap('Continue')
  })
})
