import { BaseScreen } from '../../BaseScreen.js'

const PrivacyPolicyTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
  LearnMore: 'com.ariesbifold:id/CardButton-LearnMore',
}

class PrivacyPolicyE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PrivacyPolicyTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(PrivacyPolicyTestIds.Continue)
  }

  async tapLearnMore() {
    await this.tapByTestId(PrivacyPolicyTestIds.LearnMore)
  }
}

export default new PrivacyPolicyE2EScreen()
