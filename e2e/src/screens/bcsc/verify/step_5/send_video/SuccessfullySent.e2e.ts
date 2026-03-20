import { BaseScreen } from '../../../../BaseScreen.js'

const SuccessfullySentTestIds = {
  Ok: 'com.ariesbifold:id/Ok',
}

class SuccessfullySentE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SuccessfullySentTestIds.Ok)
  }

  async tapOk() {
    await this.tapByTestId(SuccessfullySentTestIds.Ok)
  }
}

export default new SuccessfullySentE2EScreen()
