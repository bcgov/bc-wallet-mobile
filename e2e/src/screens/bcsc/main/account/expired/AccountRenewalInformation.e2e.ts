import { BaseScreen } from '../../../../BaseScreen.js'

const AccountRenewalInformationTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
  GetNewCard: 'com.ariesbifold:id/InformationGetNewCard',
  TypesOfAcceptedID: 'com.ariesbifold:id/InformationTypesOfAcceptedId',
}

class AccountRenewalInformationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AccountRenewalInformationTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(AccountRenewalInformationTestIds.Continue)
  }

  async tapGetNewCard() {
    await this.tapByTestId(AccountRenewalInformationTestIds.GetNewCard)
  }

  async tapTypesOfAcceptedID() {
    await this.tapByTestId(AccountRenewalInformationTestIds.TypesOfAcceptedID)
  }
}

export default new AccountRenewalInformationE2EScreen()
