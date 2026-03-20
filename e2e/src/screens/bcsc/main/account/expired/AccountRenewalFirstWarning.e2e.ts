import { BaseScreen } from '../../../../BaseScreen.js'

const AccountRenewalFirstWarningTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
}
class AccountRenewalFirstWarningE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountRenewalFirstWarningTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(AccountRenewalFirstWarningTestIds.Continue)
  }
}

export default new AccountRenewalFirstWarningE2EScreen()
