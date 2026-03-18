import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class PrivacyPolicyE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.PrivacyPolicy.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(TestIds.Onboarding.PrivacyPolicy.Continue)
  }

  async tapLearnMore() {
    await this.tapByTestId(TestIds.Onboarding.PrivacyPolicy.LearnMore)
  }
}

export default new PrivacyPolicyE2EScreen()
