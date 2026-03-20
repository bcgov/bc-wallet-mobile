import { BaseScreen } from '../../../BaseScreen.js'

const PairingConfirmationTestIds = {
  ToggleBookmark: 'com.ariesbifold:id/ToggleBookmark',
  Close: 'com.ariesbifold:id/Close',
}

class PairingConfirmationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PairingConfirmationTestIds.Close)
  }

  async tapToggleBookmark() {
    await this.tapByTestId(PairingConfirmationTestIds.ToggleBookmark)
  }

  async tapClose() {
    await this.tapByTestId(PairingConfirmationTestIds.Close)
  }
}

export default new PairingConfirmationE2EScreen()
