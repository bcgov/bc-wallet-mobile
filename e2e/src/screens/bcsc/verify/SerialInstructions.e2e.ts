import { BaseScreen } from '../../BaseScreen.js'

const SerialInstructionsTestIds = {
  ScanBarcode: 'com.ariesbifold:id/ScanBarcode',
  EnterManually: 'com.ariesbifold:id/EnterManually',
  Help: 'com.ariesbifold:id/Help',
}

class SerialInstructionsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SerialInstructionsTestIds.ScanBarcode)
  }

  async tapScanBarcode() {
    await this.tapByTestId(SerialInstructionsTestIds.ScanBarcode)
  }

  async tapEnterManually() {
    await this.tapByTestId(SerialInstructionsTestIds.EnterManually)
  }

  async tapHelp() {
    await this.tapByTestId(SerialInstructionsTestIds.Help)
  }
}

export default new SerialInstructionsE2EScreen()
