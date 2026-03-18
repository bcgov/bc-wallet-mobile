import { BaseScreen } from '../../BaseScreen.js'

const SecureAppTestIds = {
  BiometricAuth: 'com.ariesbifold:id/CardButton-Use Device Passcode',
  PinAuth: 'com.ariesbifold:id/CardButton-Create a PIN',
  LearnMore: 'com.ariesbifold:id/CardButton-Learn More',
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
}

export default new SecureAppE2EScreen()
