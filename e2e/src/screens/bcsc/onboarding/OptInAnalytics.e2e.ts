import { BaseScreen } from '../../BaseScreen.js'

const OptInAnalyticsTestIds = {
  Accept: 'com.ariesbifold:id/Accept',
  Decline: 'com.ariesbifold:id/Decline',
  Back: 'com.ariesbifold:id/Back',
}

class OptInAnalyticsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, OptInAnalyticsTestIds.Accept)
  }

  async tapAccept() {
    await this.tapByTestId(OptInAnalyticsTestIds.Accept)
  }

  async tapDecline() {
    await this.tapByTestId(OptInAnalyticsTestIds.Decline)
  }

  async tapBack() {
    await this.tapByTestId(OptInAnalyticsTestIds.Back)
  }
}

export default new OptInAnalyticsE2EScreen()
