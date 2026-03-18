import { BaseScreen } from '../../BaseScreen.js'

const VerifyNotCompleteTestIds = {
  SendVideo: 'com.ariesbifold:id/SendVideo',
  TryAgain: 'com.ariesbifold:id/TryAgain',
  Trouble: 'com.ariesbifold:id/Trouble',
  Help: 'com.ariesbifold:id/Help',
}

class VerifyNotCompleteE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerifyNotCompleteTestIds.SendVideo)
  }

  async tapSendVideo() {
    await this.tapByTestId(VerifyNotCompleteTestIds.SendVideo)
  }

  async tapTryAgain() {
    await this.tapByTestId(VerifyNotCompleteTestIds.TryAgain)
  }

  async tapTrouble() {
    await this.tapByTestId(VerifyNotCompleteTestIds.Trouble)
  }

  async tapHelp() {
    await this.tapByTestId(VerifyNotCompleteTestIds.Help)
  }
}

export default new VerifyNotCompleteE2EScreen()
