import { BaseScreen } from '../../BaseScreen.js'

const VerifyWebViewTestIds = {
  Back: 'com.ariesbifold:id/Back',
}

class VerifyWebViewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerifyWebViewTestIds.Back)
  }

  async tapBack() {
    await this.tapByTestId(VerifyWebViewTestIds.Back)
  }
}

export default new VerifyWebViewE2EScreen()
