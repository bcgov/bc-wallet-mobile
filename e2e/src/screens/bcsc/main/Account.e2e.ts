import { BaseScreen } from '../../BaseScreen.js'

const AccountTestIds = {
  MyDevices: 'com.ariesbifold:id/MyDevices',
  TransferAccount: 'com.ariesbifold:id/TransferAccount',
  AllAccountDetails: 'com.ariesbifold:id/AllAccountDetails',
  RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
}
class AccountE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountTestIds.RemoveAccount)
  }

  async tapMyDevices() {
    await this.tapByTestId(AccountTestIds.MyDevices)
  }

  async tapTransferAccount() {
    await this.tapByTestId(AccountTestIds.TransferAccount)
  }

  async tapAllAccountDetails() {
    await this.tapByTestId(AccountTestIds.AllAccountDetails)
  }

  async tapRemoveAccount() {
    await this.tapByTestId(AccountTestIds.RemoveAccount)
  }
}

export default new AccountE2EScreen()
