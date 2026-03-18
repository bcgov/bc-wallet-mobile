import { BaseScreen } from '../../BaseScreen.js'

const BeforeYouCallTestIds = {
  BeforeYouCallTitle: 'com.ariesbifold:id/BeforeYouCallTitle',
  HoursOfServiceTitle: 'com.ariesbifold:id/HoursOfServiceTitle',
  Continue: 'com.ariesbifold:id/Continue',
  Assistance: 'com.ariesbifold:id/Assistance',
  Help: 'com.ariesbifold:id/Help',
}

class BeforeYouCallE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, BeforeYouCallTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(BeforeYouCallTestIds.Continue)
  }

  async tapAssistance() {
    await this.tapByTestId(BeforeYouCallTestIds.Assistance)
  }

  async tapHelp() {
    await this.tapByTestId(BeforeYouCallTestIds.Help)
  }
}

export default new BeforeYouCallE2EScreen()
