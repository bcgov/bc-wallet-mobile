import { BaseScreen } from '../../BaseScreen.js'

const PermissionDisabledTestIds = {
  OpenSettings: 'com.ariesbifold:id/OpenSettings',
}

class PermissionDisabledE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PermissionDisabledTestIds.OpenSettings)
  }

  async tapOpenSettings() {
    await this.tapByTestId(PermissionDisabledTestIds.OpenSettings)
  }
}

export default new PermissionDisabledE2EScreen()
