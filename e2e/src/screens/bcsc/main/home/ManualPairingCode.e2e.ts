import { BaseScreen } from '../../../BaseScreen.js'

const ManualPairingCodeTestIds = {
  Submit: 'com.ariesbifold:id/Submit',
  PairingCodeInput: 'com.ariesbifold:id/PairingCodeInput',
}

class ManualPairingCodeE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ManualPairingCodeTestIds.Submit)
  }

  async tapSubmit() {
    await this.tapByTestId(ManualPairingCodeTestIds.Submit)
  }

  async enterPairingCode(code: string) {
    await this.enterText(ManualPairingCodeTestIds.PairingCodeInput, code, {
      tapFirst: true,
      characterByCharacter: true,
    })
    await this.dismissKeyboard()
  }
}

export default new ManualPairingCodeE2EScreen()
