import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { getVerifyContext } from './card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const DualIdentificationRequired = new BaseScreen(BCSC_TestIDs.DualIdentificationRequired)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)

describe(`BCSC ${getVerifyContext().cardTypeLabel} Card`, () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    const { cardTypeButton } = getVerifyContext()
    await IdentitySelection.tap(cardTypeButton)
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
})
