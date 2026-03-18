import { BaseScreen } from '../../BaseScreen.js'

const NotificationsTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
  OpenSettings: 'com.ariesbifold:id/OpenSettings',
  ContinueWithoutNotifications: 'com.ariesbifold:id/ContinueWithoutNotifications',
}

class NotificationsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, NotificationsTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(NotificationsTestIds.Continue)
  }

  async tapOpenSettings() {
    await this.tapByTestId(NotificationsTestIds.OpenSettings)
  }

  async tapContinueWithoutNotifications() {
    await this.tapByTestId(NotificationsTestIds.ContinueWithoutNotifications)
  }
}

export default new NotificationsE2EScreen()
