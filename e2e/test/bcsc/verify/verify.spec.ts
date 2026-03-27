import { getE2EConfig } from '../../../src/e2eConfig.js'
import { approveInPersonRequest } from '../../../src/helpers/approval.js'
import { injectPhoto } from '../../../src/helpers/camera.js'
import { acceptCameraPermissionIfPresent } from '../../../src/helpers/notifications.js'
import { isSauceLabs } from '../../../src/helpers/sauce.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const { verify } = getE2EConfig()

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const Nickname = new BaseScreen(BCSC_TestIDs.Nickname)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const VerifyInPerson = new BaseScreen(BCSC_TestIDs.VerifyInPerson)
const VerificationSuccess = new BaseScreen(BCSC_TestIDs.VerificationSuccess)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const AccountSelector = new BaseScreen(BCSC_TestIDs.AccountSelector)
const EnterPIN = new BaseScreen(BCSC_TestIDs.EnterPIN)
const AdditionalIdentificationRequired = new BaseScreen(BCSC_TestIDs.AdditionalIdentificationRequired)
const EvidenceTypeList = new BaseScreen(BCSC_TestIDs.EvidenceTypeList)
const EvidenceCapture = new BaseScreen(BCSC_TestIDs.EvidenceCapture)
const IDPhotoInformation = new BaseScreen(BCSC_TestIDs.IDPhotoInformation)
const EvidenceIDCollection = new BaseScreen(BCSC_TestIDs.EvidenceIDCollection)
const PhotoReview = new BaseScreen(BCSC_TestIDs.PhotoReview)

if (verify.includeStep0) {
  describe('Step 0: Verify', () => {
    it('should sign out and sign in', async () => {
      await SetupSteps.waitFor('SettingsMenuButton')
      await SetupSteps.tap('SettingsMenuButton')
      await Settings.waitFor('SignOut')
      await Settings.tap('SignOut')
      await AccountSelector.waitFor('ContinueSetup')
      await AccountSelector.tap('ContinueSetup')
      await EnterPIN.waitFor('PINInput')
      await EnterPIN.type('PINInput', '123456')
      await EnterPIN.tap('Continue')
    })
  })
}

describe('Nickname', () => {
  it('should display the Setup Steps screen and tap Step 1', async () => {
    await SetupSteps.waitFor('Step1')
    await SetupSteps.tap('Step1')
  })

  it('should fill in the Nickname', async () => {
    await Nickname.waitFor('AccountNicknamePressable')
    await Nickname.type('AccountNicknamePressable', verify.testUser.username)
    await Nickname.tap('SaveAndContinue')
  })
})

type CardTypeButtonId = 'CombinedCard' | 'PhotoCard' | 'NoPhotoCard' | 'CheckForServicesCard' | 'OtherID'
const cardTypeButtonId: Record<string, CardTypeButtonId> = {
  combined: 'CombinedCard',
  photo: 'PhotoCard',
  nonPhoto: 'NoPhotoCard',
  na: 'OtherID',
}

describe(`BCSC ${verify.verifyCardType} Card`, () => {
  const buttonId = cardTypeButtonId[verify.verifyCardType]

  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    await IdentitySelection.waitFor(buttonId)
    await IdentitySelection.tap(buttonId)
  })

  it('should navigate through the Serial Instructions screen and tap Enter Manually', async () => {
    await SerialInstructions.waitFor('EnterManually', 10_000)
    await SerialInstructions.tap('EnterManually')
  })

  it('should navigate through the Manual Serial screen and fill in the Serial', async () => {
    await ManualSerial.waitFor('SerialPressable')
    await ManualSerial.type('SerialPressable', verify.testUser.cardSerial)
    await ManualSerial.dismissKeyboard()
    await ManualSerial.tap('Continue')
  })

  it('should navigate through the Enter Birthdate screen and fill in the Birthdate', async () => {
    await EnterBirthdate.waitFor('Done', 10_000)
    await EnterBirthdate.tap('BirthdateInputPressable')
    await EnterBirthdate.type('BirthdateInputPressable', verify.testUser.dob)
    await EnterBirthdate.dismissKeyboard()
    await EnterBirthdate.tap('Done')
  })
})

if (verify.verifyCardType === 'nonPhoto') {
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
      await EvidenceIDCollection.waitFor('DocumentNumberPressable')
      await EvidenceIDCollection.type('DocumentNumberPressable', verify.testUser.documentNumber)
      await EvidenceIDCollection.dismissKeyboard()
      await EvidenceIDCollection.tap('Continue')
    })
  })
}

describe('In-Person Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupSteps.waitFor('Step5', 10_000)
    await SetupSteps.tap('Step5')
  })

  it('should navigate through the Verification Method Selection screen and tap In Person', async () => {
    await VerificationMethodSelection.waitFor('InPerson')
    await VerificationMethodSelection.tap('InPerson')
  })

  it('should navigate through the Verify In Person screen and tap Complete', async () => {
    await VerifyInPerson.waitFor('ConfirmationCode')

    const confirmationCode = await VerifyInPerson.getText('ConfirmationCode')
    console.log(`[e2e] Read confirmation code from screen: "${confirmationCode}"`)

    await approveInPersonRequest(confirmationCode, verify.testUser.cardSerial, verify.testUser.dob)

    await VerifyInPerson.waitFor('Complete')
    await VerifyInPerson.tap('Complete')
    await VerificationSuccess.waitFor('Ok')
    await VerificationSuccess.tap('Ok')
  })
})
