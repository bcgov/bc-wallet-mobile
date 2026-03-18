import { BaseScreen } from '../../BaseScreen.js'

const SystemModalTestIds = {
  SystemModalButton: 'com.ariesbifold:id/SystemModalButton',
}

/**
 * Shared system modal screen covering InternetDisconnected,
 * MandatoryUpdate, and DeviceInvalidated modals.
 * All use the same SystemModalButton testId.
 */
class SystemModalE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SystemModalTestIds.SystemModalButton)
  }

  async tapButton() {
    await this.tapByTestId(SystemModalTestIds.SystemModalButton)
  }
}

export default new SystemModalE2EScreen()
