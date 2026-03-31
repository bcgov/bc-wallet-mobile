import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const Notifications = new BaseScreen(BCSC_TestIDs.Notifications)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)

describe('Notifications Help Detour', () => {
  it('should tap Help on the Notifications screen and navigate back', async () => {
    await Notifications.waitFor('Help')
    await Notifications.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })
})
