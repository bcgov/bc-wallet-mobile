import { BaseScreen } from '../../BaseScreen.js'

const AccountSetupTestIds = {
  DeveloperMode: 'com.ariesbifold:id/DeveloperMode',
  AddAccount: 'com.ariesbifold:id/AddAccount',
  TransferAccount: 'com.ariesbifold:id/TransferAccount',
}

class AccountSetupE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountSetupTestIds.AddAccount)
  }

  async tapAddAccount() {
    await this.tapByTestId(AccountSetupTestIds.AddAccount)
  }

  async tapTransferAccount() {
    await this.tapByTestId(AccountSetupTestIds.TransferAccount)
  }

  async tapDeveloperMode() {
    await this.tapByTestId(AccountSetupTestIds.DeveloperMode)
  }
}

export default new AccountSetupE2EScreen()
