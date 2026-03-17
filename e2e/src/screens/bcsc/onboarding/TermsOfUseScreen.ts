import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class TermsOfUseScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.TermsOfUse.AcceptAndContinue)
  }

  async tapAcceptAndContinue() {
    const el = await this.findByTestId(TestIds.Onboarding.TermsOfUse.AcceptAndContinue)
    await el.waitForDisplayed({ timeout: 20_000 })
    // Button is disabled until the webview content loads; wait for it to become tappable
    await el.waitForEnabled({ timeout: 30_000 })
    await el.click()
  }

  async tapRetry() {
    await this.tapByTestId(TestIds.Onboarding.TermsOfUse.RetryTermsOfUse)
  }
}

export default new TermsOfUseScreen()
