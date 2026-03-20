import { BaseScreen } from '../../../../BaseScreen.js'

const TransferAccountSuccessTestIds = {
  TransferSuccessButton: 'com.ariesbifold:id/TransferSuccessButton',
  RemoveAccountButton: 'com.ariesbifold:id/RemoveAccountButton',
}

class TransferAccountSuccessE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TransferAccountSuccessTestIds.TransferSuccessButton)
  }

  async tapTransferSuccessButton() {
    await this.tapByTestId(TransferAccountSuccessTestIds.TransferSuccessButton)
  }

  async tapRemoveAccountButton() {
    await this.tapByTestId(TransferAccountSuccessTestIds.RemoveAccountButton)
  }
}

export default new TransferAccountSuccessE2EScreen()
