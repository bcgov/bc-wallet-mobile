import { BaseScreen } from '../../BaseScreen.js'

const VerificationCardErrorTestIds = {
  GetBCSC: 'com.ariesbifold:id/GetBCSC',
}

class VerificationCardErrorE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerificationCardErrorTestIds.GetBCSC)
  }

  async tapGetBCSC() {
    await this.tapByTestId(VerificationCardErrorTestIds.GetBCSC)
  }
}

export default new VerificationCardErrorE2EScreen()
