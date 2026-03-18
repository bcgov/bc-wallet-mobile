import { BaseScreen } from '../../BaseScreen.js'

const DualIdentificationRequiredTestIds = {
  ChooseID: 'com.ariesbifold:id/Choose ID',
  OpenAccountServices: 'com.ariesbifold:id/OpenAccountServices',
  Help: 'com.ariesbifold:id/Help',
}

class DualIdentificationRequiredE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, DualIdentificationRequiredTestIds.ChooseID)
  }

  async tapChooseID() {
    await this.tapByTestId(DualIdentificationRequiredTestIds.ChooseID)
  }

  async tapOpenAccountServices() {
    await this.tapByTestId(DualIdentificationRequiredTestIds.OpenAccountServices)
  }

  async tapHelp() {
    await this.tapByTestId(DualIdentificationRequiredTestIds.Help)
  }
}

export default new DualIdentificationRequiredE2EScreen()
