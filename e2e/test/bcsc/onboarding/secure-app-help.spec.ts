import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

describe('Secure App Help Detour', () => {
  it('should tap Learn More on the Secure App screen and navigate back', async () => {
    await SecureApp.waitFor('LearnMore')
    await SecureApp.tap('LearnMore')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })
})
