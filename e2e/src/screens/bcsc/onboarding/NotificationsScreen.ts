import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class NotificationsScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.Notifications.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(TestIds.Onboarding.Notifications.Continue)
  }

  async tapOpenSettings() {
    await this.tapByTestId(TestIds.Onboarding.Notifications.OpenSettings)
  }

  async tapContinueWithoutNotifications() {
    await this.tapByTestId(TestIds.Onboarding.Notifications.ContinueWithoutNotifications)
  }
}

export default new NotificationsScreen()
