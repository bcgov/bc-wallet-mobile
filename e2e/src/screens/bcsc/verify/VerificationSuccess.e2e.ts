import { BaseScreen } from '../../BaseScreen.js'

const VerificationSuccessTestIds = {
  Ok: 'com.ariesbifold:id/Ok',
}

class VerificationSuccessE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerificationSuccessTestIds.Ok)
  }

  async tapOk() {
    await this.tapByTestId(VerificationSuccessTestIds.Ok)
  }
}

export default new VerificationSuccessE2EScreen()
