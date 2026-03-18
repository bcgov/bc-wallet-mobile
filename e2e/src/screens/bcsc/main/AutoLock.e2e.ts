import { BaseScreen } from '../../BaseScreen.js'

const AutoLockTestIds = {
  ToggleAutoLockSwitch: 'com.ariesbifold:id/ToggleAutoLockSwitch',
  AutoLockTime5: 'com.ariesbifold:id/auto-lock-time-5',
  AutoLockTime3: 'com.ariesbifold:id/auto-lock-time-3',
  AutoLockTime1: 'com.ariesbifold:id/auto-lock-time-1',
}

class AutoLockE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AutoLockTestIds.ToggleAutoLockSwitch)
  }

  async tapToggleAutoLock() {
    await this.tapByTestId(AutoLockTestIds.ToggleAutoLockSwitch)
  }

  async tapTime5Minutes() {
    await this.tapByTestId(AutoLockTestIds.AutoLockTime5)
  }

  async tapTime3Minutes() {
    await this.tapByTestId(AutoLockTestIds.AutoLockTime3)
  }

  async tapTime1Minute() {
    await this.tapByTestId(AutoLockTestIds.AutoLockTime1)
  }
}

export default new AutoLockE2EScreen()
