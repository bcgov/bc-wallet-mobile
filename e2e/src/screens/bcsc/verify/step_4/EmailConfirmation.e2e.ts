import { BaseScreen } from '../../../BaseScreen.js'

const EmailConfirmationTestIds = {
  ContinueButton: 'ContinueButton',
  ResendCodeButton: 'ResendCodeButton',
  GoToEmailButton: 'GoToEmailButton',
}

class EmailConfirmationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EmailConfirmationTestIds.ContinueButton)
  }

  async tapContinue() {
    await this.tapByTestId(EmailConfirmationTestIds.ContinueButton)
  }

  async tapResendCode() {
    await this.tapByTestId(EmailConfirmationTestIds.ResendCodeButton)
  }

  async tapGoToEmail() {
    await this.tapByTestId(EmailConfirmationTestIds.GoToEmailButton)
  }
}

export default new EmailConfirmationE2EScreen()
