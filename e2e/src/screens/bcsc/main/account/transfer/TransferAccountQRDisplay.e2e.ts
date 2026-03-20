import { BaseScreen } from '../../../../BaseScreen.js'

const TransferAccountQRDisplayTestIds = {
  GetNewQRCode: 'com.ariesbifold:id/GetNewQRCode',
}

class TransferAccountQRDisplayE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TransferAccountQRDisplayTestIds.GetNewQRCode)
  }

  async tapGetNewQRCode() {
    await this.tapByTestId(TransferAccountQRDisplayTestIds.GetNewQRCode)
  }
}

export default new TransferAccountQRDisplayE2EScreen()
