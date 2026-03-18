import { BaseScreen } from '../../BaseScreen.js'

const WebViewTestIds = {
  Back: 'com.ariesbifold:id/Back',
}

class WebViewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, WebViewTestIds.Back)
  }

  async tapBack() {
    await this.tapByTestId(WebViewTestIds.Back)
  }
}

export default new WebViewE2EScreen()
