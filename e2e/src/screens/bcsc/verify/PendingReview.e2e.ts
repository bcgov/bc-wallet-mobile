import { BaseScreen } from '../../BaseScreen.js'

const PendingReviewTestIds = {
  Ok: 'com.ariesbifold:id/Ok',
}

class PendingReviewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PendingReviewTestIds.Ok)
  }

  async tapOk() {
    await this.tapByTestId(PendingReviewTestIds.Ok)
  }
}

export default new PendingReviewE2EScreen()
