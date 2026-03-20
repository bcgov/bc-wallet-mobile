import { BaseScreen } from '../../../../BaseScreen.js'

const TransferAccountQRInformationTestIds = {
  GetQRCodeButton: 'com.ariesbifold:id/GetQRCodeButton',
  LearnMoreButton: 'com.ariesbifold:id/LearnMoreButton',
}

class TransferAccountQRInformationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TransferAccountQRInformationTestIds.GetQRCodeButton)
  }

  async tapGetQRCode() {
    await this.tapByTestId(TransferAccountQRInformationTestIds.GetQRCodeButton)
  }

  async tapLearnMore() {
    await this.tapByTestId(TransferAccountQRInformationTestIds.LearnMoreButton)
  }
}

export default new TransferAccountQRInformationE2EScreen()
