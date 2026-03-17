import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class AccountSetupScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.AccountSetup.AddAccount)
  }

  async tapAddAccount() {
    await this.tapByTestId(TestIds.Onboarding.AccountSetup.AddAccount)
  }

  async tapTransferAccount() {
    await this.tapByTestId(TestIds.Onboarding.AccountSetup.TransferAccount)
  }

  async tapDeveloperMode() {
    await this.tapByTestId(TestIds.Onboarding.AccountSetup.DeveloperMode)
  }
}

export default new AccountSetupScreen()
