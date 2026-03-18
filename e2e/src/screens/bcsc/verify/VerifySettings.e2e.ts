import { BaseScreen } from '../../BaseScreen.js'

const VerifySettingsTestIds = {
  Back: 'com.ariesbifold:id/Back',
}

class VerifySettingsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerifySettingsTestIds.Back)
  }

  async tapBack() {
    await this.tapByTestId(VerifySettingsTestIds.Back)
  }
}

export default new VerifySettingsE2EScreen()
