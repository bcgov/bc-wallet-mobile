import { BaseScreen } from '../../BaseScreen.js'

export const AccountTestIds = {
  AccountScreen: 'com.ariesbifold:id/AccountScreen',
  MyDevices: 'com.ariesbifold:id/MyDevices',
  TransferAccount: 'com.ariesbifold:id/TransferAccount',
  AllAccountDetails: 'com.ariesbifold:id/AllAccountDetails',
  RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
}

class AccountE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 60_000) {
    const el = await this.findByText('App expiry date')
    await el.waitForDisplayed({ timeout: timeout })
  }

  async waitForMyDevices(timeout = 60_000) {
    await super.waitForDisplayed(timeout, AccountTestIds.MyDevices)
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
