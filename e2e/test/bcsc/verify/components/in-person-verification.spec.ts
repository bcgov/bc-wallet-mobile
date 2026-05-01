import { ApproveInPersonInput, approveInPersonRequest } from '../../../../src/helpers/approval.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'
import { getVerifyContext } from '../card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerificationMethodSelection = new BaseScreen(BCSC_TestIDs.VerificationMethodSelection)
const VerifyInPerson = new BaseScreen(BCSC_TestIDs.VerifyInPerson)
const VerificationSuccess = new BaseScreen(BCSC_TestIDs.VerificationSuccess)

describe('In-Person Verification', () => {
  it('should navigate through the Setup Steps screen and tap Step 5', async () => {
    await SetupSteps.waitFor('Step5', 1_000)
    await SetupSteps.tap('Step5')
  })

  it('should navigate through the Verification Method Selection screen and tap In Person', async () => {
    await VerificationMethodSelection.waitFor('InPerson')
    await VerificationMethodSelection.tap('InPerson')
  })

  it('should navigate through the Verify In Person screen and tap Complete', async () => {
    const { testUser } = getVerifyContext()

    await VerifyInPerson.waitFor('ConfirmationCode')

    const confirmationCode = await VerifyInPerson.getText('ConfirmationCode')
    console.log(`[e2e] Read confirmation code from screen: "${confirmationCode}"`)

    let input: ApproveInPersonInput
    if (testUser.flow === 'non-bcsc') {
      input = {
        flow: 'non-bcsc',
        documents: [
          { typeId: testUser.primaryDocumentTypeId, number: testUser.primaryDocumentNumber },
          { typeId: testUser.documentTypeId, number: testUser.documentNumber },
        ],
      }
    } else if (testUser.flow === 'non-photo') {
      input = {
        flow: 'non-photo',
        cardSerialNumber: testUser.cardSerial,
        cardBirthdate: testUser.dob,
        document: { typeId: testUser.documentTypeId, number: testUser.documentNumber },
      }
    } else {
      input = {
        flow: 'photo',
        cardSerialNumber: testUser.cardSerial,
        cardBirthdate: testUser.dob,
      }
    }

    await approveInPersonRequest(confirmationCode, input)

    await VerifyInPerson.waitFor('Complete')
    await VerifyInPerson.tap('Complete')
    await VerificationSuccess.waitFor('Ok')
    await VerificationSuccess.tap('Ok')
  })
})
