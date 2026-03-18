import { BaseScreen } from '../../BaseScreen.js'

const CancelledReviewTestIds = {
  SystemModalButton: 'com.ariesbifold:id/SystemModalButton',
}

class CancelledReviewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, CancelledReviewTestIds.SystemModalButton)
  }

  async tapDismiss() {
    await this.tapByTestId(CancelledReviewTestIds.SystemModalButton)
  }
}

export default new CancelledReviewE2EScreen()
