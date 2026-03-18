import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class SecureAppE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.SecureApp.PinAuth)
  }

  async tapBiometricAuth() {
    await this.tapByTestId(TestIds.Onboarding.SecureApp.BiometricAuth)
  }

  async tapPinAuth() {
    await this.tapByTestId(TestIds.Onboarding.SecureApp.PinAuth)
  }

  async tapLearnMore() {
    await this.tapByTestId(TestIds.Onboarding.SecureApp.LearnMore)
  }
}

export default new SecureAppE2EScreen()
