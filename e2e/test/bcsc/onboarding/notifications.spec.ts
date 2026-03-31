import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const Notifications = new BaseScreen(BCSC_TestIDs.Notifications)

describe('Notifications', () => {
  it('should navigate through the Notifications screen', async () => {
    if (!driver.isAndroid) {
      await Notifications.waitFor('Continue')
      await Notifications.tap('Continue')
    }
  })
})
