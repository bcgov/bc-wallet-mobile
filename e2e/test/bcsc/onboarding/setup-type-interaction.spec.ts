import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const SetupTypes = new BaseScreen(BCSC_TestIDs.SetupTypes)

describe('Setup Type Interaction', () => {
  it('should select radio options on the Setup Types screen', async () => {
    await SetupTypes.waitFor('SomeoneElseIdRadioGroup')
    await SetupTypes.tap('SomeoneElseIdRadioGroup')
    await SetupTypes.waitFor('OtherPersonPresentRadioGroupNoOption')
    await SetupTypes.tap('OtherPersonPresentRadioGroupNoOption')
    await SetupTypes.waitFor('OtherPersonPresentRadioGroupYesOption')
    await SetupTypes.tap('OtherPersonPresentRadioGroupYesOption')
  })
})
