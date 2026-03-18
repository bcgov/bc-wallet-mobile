import { BaseScreen } from '../../BaseScreen.js'

const BirthdateLockoutTestIds = {
  Close: 'com.ariesbifold:id/Close',
}

class BirthdateLockoutE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, BirthdateLockoutTestIds.Close)
  }

  async tapClose() {
    await this.tapByTestId(BirthdateLockoutTestIds.Close)
  }
}

export default new BirthdateLockoutE2EScreen()
