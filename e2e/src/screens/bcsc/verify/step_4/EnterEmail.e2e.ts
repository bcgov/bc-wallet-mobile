import { BaseScreen } from '../../../BaseScreen.js'

const EnterEmailTestIds = {
  EmailInput: 'EmailInput',
  ContinueButton: 'ContinueButton',
  SkipButton: 'SkipButton',
}

class EnterEmailE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EnterEmailTestIds.EmailInput)
  }

  async enterEmail(email: string) {
    await this.enterText(EnterEmailTestIds.EmailInput, email, {
      tapFirst: true,
    })
  }

  async tapContinue() {
    await this.tapByTestId(EnterEmailTestIds.ContinueButton)
  }

  async tapSkip() {
    await this.tapByTestId(EnterEmailTestIds.SkipButton)
  }
}

export default new EnterEmailE2EScreen()
