import { BaseScreen } from '../../BaseScreen.js'

const AccountExpiredTestIds = {
  Renew: 'com.ariesbifold:id/Renew',
  RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
}

class AccountExpiredE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountExpiredTestIds.Renew)
  }

  async tapRenew() {
    await this.tapByTestId(AccountExpiredTestIds.Renew)
  }

  async tapRemoveAccount() {
    await this.tapByTestId(AccountExpiredTestIds.RemoveAccount)
  }
}

export default new AccountExpiredE2EScreen()
