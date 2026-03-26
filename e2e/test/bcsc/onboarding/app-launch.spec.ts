import { acceptLocalNetworkPermissionIfPresent } from '../../../src/helpers/iosPermissions.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)

describe('App Launch', () => {
  it('should display the Account Setup screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await AccountSetup.waitFor('AddAccount', 20_000)
  })
})
