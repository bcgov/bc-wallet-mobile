import { BaseScreen } from '../../../../BaseScreen.js'

const StartCallTestIds = {
  Help: 'com.ariesbifold:id/Help',
}

class StartCallE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, StartCallTestIds.Help)
  }

  async tapHelp() {
    await this.tapByTestId(StartCallTestIds.Help)
  }
}

export default new StartCallE2EScreen()
