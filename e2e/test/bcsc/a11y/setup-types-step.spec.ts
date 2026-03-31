import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)

describe('Step: AccountSetup → SetupTypes', () => {
  it('should tap Add Account', async () => {
    await AccountSetup.waitFor('AddAccount')
    await AccountSetup.tap('AddAccount')
  })
})
