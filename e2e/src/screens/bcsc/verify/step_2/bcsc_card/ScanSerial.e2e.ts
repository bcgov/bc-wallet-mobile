import { BaseScreen } from '../../../../BaseScreen.js'

const ScanSerialTestIds = {
  EnterManually: 'com.ariesbifold:id/EnterManually',
  Help: 'com.ariesbifold:id/Help',
}

class ScanSerialE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ScanSerialTestIds.EnterManually)
  }

  async tapEnterManually() {
    await this.tapByTestId(ScanSerialTestIds.EnterManually)
  }

  async tapHelp() {
    await this.tapByTestId(ScanSerialTestIds.Help)
  }
}

export default new ScanSerialE2EScreen()
