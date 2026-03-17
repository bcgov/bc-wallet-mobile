import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class OptInAnalyticsScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.OptInAnalytics.Accept)
  }

  async tapAccept() {
    await this.tapByTestId(TestIds.Onboarding.OptInAnalytics.Accept)
  }

  async tapDecline() {
    await this.tapByTestId(TestIds.Onboarding.OptInAnalytics.Decline)
  }
}

export default new OptInAnalyticsScreen()
