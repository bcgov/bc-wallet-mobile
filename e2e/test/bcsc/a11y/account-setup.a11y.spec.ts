import { assertA11yLabel } from '../../../src/helpers/a11y.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

// Grab the screen we are expecting to be one
const { AccountSetup } = BCSC_TestIDs

describe('Accessibility: Account Setup screen', () => {
  it('AddAccount button has an accessibility label', async () => {
    await assertA11yLabel(AccountSetup.AddAccount)
  })

  it('TransferAccount button has an accessibility label', async () => {
    await assertA11yLabel(AccountSetup.TransferAccount)
  })
})
