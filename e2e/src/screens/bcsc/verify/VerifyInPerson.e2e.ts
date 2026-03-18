import { BaseScreen } from '../../BaseScreen.js'

const VerifyInPersonTestIds = {
  ServiceBCLink: 'com.ariesbifold:id/ServiceBCLink',
  Complete: 'com.ariesbifold:id/Complete',
  Help: 'com.ariesbifold:id/Help',
}

class VerifyInPersonE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerifyInPersonTestIds.Complete)
  }

  async tapServiceBCLink() {
    await this.tapByTestId(VerifyInPersonTestIds.ServiceBCLink)
  }

  async tapComplete() {
    await this.tapByTestId(VerifyInPersonTestIds.Complete)
  }

  async tapHelp() {
    await this.tapByTestId(VerifyInPersonTestIds.Help)
  }
}

export default new VerifyInPersonE2EScreen()
