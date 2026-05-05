/**
 * SetupSteps SettingsMenuButton → VerifySettings → Back to SetupSteps.
 * Pre: SetupSteps anchor. Post: SetupSteps anchor.
 */
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const VerifySettings = new BaseScreen(BCSC_TestIDs.VerifySettings)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

describe('SetupSteps → Settings detour', () => {
  it('opens VerifySettings via SettingsMenuButton and returns', async () => {
    await SetupSteps.waitFor('SettingsMenuButton')
    await SetupSteps.tap('SettingsMenuButton')
    await VerifySettings.waitFor('Back')
    await VerifySettings.tap('Back')
    await SetupSteps.waitFor('Step1')
  })
})

describe('SetupSteps → Help WebView detour', () => {
  it('opens the SetupSteps Help WebView and returns', async () => {
    await SetupSteps.waitFor('Help')
    await SetupSteps.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await SetupSteps.waitFor('Step1')
  })
})
