import { BaseScreen } from '../../BaseScreen.js'

const AccountRenewalFinalWarningTestIds = {
  Renew: 'com.ariesbifold:id/Renew',
}
class AccountRenewalFinalWarningE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountRenewalFinalWarningTestIds.Renew)
  }

  async tapRenew() {
    await this.tapByTestId(AccountRenewalFinalWarningTestIds.Renew)
  }
}

export default new AccountRenewalFinalWarningE2EScreen()
