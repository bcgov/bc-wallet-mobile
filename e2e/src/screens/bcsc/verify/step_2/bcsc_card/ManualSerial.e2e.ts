import { BaseScreen } from '../../../../BaseScreen.js'

const ManualSerialTestIds = {
  SerialInput: 'com.ariesbifold:id/SerialInput',
  Continue: 'com.ariesbifold:id/Continue',
  Help: 'com.ariesbifold:id/Help',
}

class ManualSerialE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ManualSerialTestIds.SerialInput)
  }

  async enterSerial(serial: string) {
    await this.enterText(ManualSerialTestIds.SerialInput, serial, {
      tapFirst: true,
    })
    await this.dismissKeyboard()
  }

  async tapContinue() {
    await this.tapByTestId(ManualSerialTestIds.Continue)
  }

  async tapHelp() {
    await this.tapByTestId(ManualSerialTestIds.Help)
  }
}

export default new ManualSerialE2EScreen()
