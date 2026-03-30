import { assertA11yLabel } from '../../../src/helpers/a11y.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

// Grab the screen we are expecting to be one
const { SetupTypes } = BCSC_TestIDs

describe('Accessibility: Setup Types screen', () => {
  it('Continue button has an accessibility label', async () => {
    await assertA11yLabel(SetupTypes.Continue)
  })

  it('Cancel button has an accessibility label', async () => {
    await assertA11yLabel(SetupTypes.Cancel)
  })
})
