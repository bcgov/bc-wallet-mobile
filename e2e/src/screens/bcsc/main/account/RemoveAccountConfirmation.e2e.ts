import { BaseScreen } from '../../../BaseScreen.js'

const RemoveAccountConfirmationTestIds = {
  RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
  Cancel: 'com.ariesbifold:id/Cancel',
}

class RemoveAccountConfirmationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, RemoveAccountConfirmationTestIds.RemoveAccount)
  }

  async tapRemoveAccount() {
    await this.tapByTestId(RemoveAccountConfirmationTestIds.RemoveAccount)
  }

  async tapCancel() {
    await this.tapByTestId(RemoveAccountConfirmationTestIds.Cancel)
  }
}

export default new RemoveAccountConfirmationE2EScreen()
