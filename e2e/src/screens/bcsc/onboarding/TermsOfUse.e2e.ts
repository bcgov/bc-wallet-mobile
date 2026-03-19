import { BaseScreen } from '../../BaseScreen.js'

const TermsOfUseTestIds = {
  AcceptAndContinue: 'com.ariesbifold:id/AcceptAndContinue',
  RetryTermsOfUse: 'com.ariesbifold:id/RetryTermsOfUse',
  Back: 'com.ariesbifold:id/Back',
}

class TermsOfUseE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TermsOfUseTestIds.AcceptAndContinue)
  }

  async tapAcceptAndContinue() {
    const el = await this.findByTestId(TermsOfUseTestIds.AcceptAndContinue)
    await el.waitForDisplayed({ timeout: 20_000 })
    // Button is disabled until the webview content loads; wait for it to become tappable
    await el.waitForEnabled({ timeout: 30_000 })
    await el.click()
  }

  async tapRetry() {
    await this.tapByTestId(TermsOfUseTestIds.RetryTermsOfUse)
  }

  async tapBack() {
    await this.tapByTestId(TermsOfUseTestIds.Back)
  }
}

export default new TermsOfUseE2EScreen()
