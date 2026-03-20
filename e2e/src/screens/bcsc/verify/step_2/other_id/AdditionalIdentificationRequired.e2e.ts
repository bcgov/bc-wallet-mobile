import { BaseScreen } from '../../../../BaseScreen.js'

const AdditionalIdentificationRequiredTestIds = {
  ChooseID: 'com.ariesbifold:id/Choose ID',
  OpenAccountServices: 'com.ariesbifold:id/OpenAccountServices',
  Help: 'com.ariesbifold:id/Help',
}

class AdditionalIdentificationRequiredE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AdditionalIdentificationRequiredTestIds.ChooseID)
  }

  async tapChooseID() {
    await this.tapByTestId(AdditionalIdentificationRequiredTestIds.ChooseID)
  }

  async tapOpenAccountServices() {
    await this.tapByTestId(AdditionalIdentificationRequiredTestIds.OpenAccountServices)
  }

  async tapHelp() {
    await this.tapByTestId(AdditionalIdentificationRequiredTestIds.Help)
  }
}

export default new AdditionalIdentificationRequiredE2EScreen()
