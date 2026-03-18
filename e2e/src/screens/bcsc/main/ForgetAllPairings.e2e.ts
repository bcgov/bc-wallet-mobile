import { BaseScreen } from '../../BaseScreen.js'

const ForgetAllPairingsTestIds = {
  ForgetAllPairings: 'com.ariesbifold:id/ForgetAllPairings',
}

class ForgetAllPairingsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ForgetAllPairingsTestIds.ForgetAllPairings)
  }

  async tapForgetAllPairings() {
    await this.tapByTestId(ForgetAllPairingsTestIds.ForgetAllPairings)
  }
}

export default new ForgetAllPairingsE2EScreen()
