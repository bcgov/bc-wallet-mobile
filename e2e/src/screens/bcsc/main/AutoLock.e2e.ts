import { BaseScreen } from '../../BaseScreen.js'

const AutoLockTestIds = {
  AutoLockTime5: 'com.ariesbifold:id/auto-lock-time-5',
  AutoLockTime3: 'com.ariesbifold:id/auto-lock-time-3',
  AutoLockTime1: 'com.ariesbifold:id/auto-lock-time-1',
  BackButton: 'com.ariesbifold:id/Back',
}

class AutoLockE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, AutoLockTestIds.AutoLockTime5)
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

  async tapBack() {
    await this.tapByTestId(AutoLockTestIds.BackButton)
  }
}

export default new AutoLockE2EScreen()
