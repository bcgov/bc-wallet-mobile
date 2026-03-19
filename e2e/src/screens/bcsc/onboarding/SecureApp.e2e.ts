import { BaseScreen } from '../../BaseScreen.js'

const SecureAppTestIds = {
  BiometricAuth: 'com.ariesbifold:id/ChooseDeviceAuthButton',
  PinAuth: 'com.ariesbifold:id/ChoosePINButton',
  LearnMore: 'com.ariesbifold:id/LearnMoreButton',
  Back: 'com.ariesbifold:id/Back',
}

class SecureAppE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SecureAppTestIds.PinAuth)
  }

  async tapBiometricAuth() {
    await this.tapByTestId(SecureAppTestIds.BiometricAuth)
  }

  async tapPinAuth() {
    await this.tapByTestId(SecureAppTestIds.PinAuth)
  }

  async tapLearnMore() {
    await this.tapByTestId(SecureAppTestIds.LearnMore)
  }

  async tapBack() {
    await this.tapByTestId(SecureAppTestIds.Back)
  }
}

export default new SecureAppE2EScreen()
