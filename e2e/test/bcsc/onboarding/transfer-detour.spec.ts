import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const TransferInformation = new BaseScreen(BCSC_TestIDs.TransferInformation)
const PrivacyPolicy = new BaseScreen(BCSC_TestIDs.PrivacyPolicy)

describe('Transfer Account Detour', () => {
  it('should detour through Transfer Account and navigate back', async () => {
    await AccountSetup.tap('TransferAccount')
    await TransferInformation.waitFor('TransferAccountButton')
    await TransferInformation.tap('TransferAccountButton')
    await PrivacyPolicy.waitFor('Back')
    await PrivacyPolicy.tap('Back')
    await TransferInformation.waitFor('Back')
    await TransferInformation.tap('Back')
  })
})
