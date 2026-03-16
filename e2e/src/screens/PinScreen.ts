import { getVariantConfig } from '../variant.js'
import { BaseScreen } from './BaseScreen.js'

class PinScreen extends BaseScreen {
  // TODO: Add PIN input selectors
  private variant = getVariantConfig()

  async waitForDisplayed(timeout = 20_000) {
    const el = await this.findByTestId(this.variant.selectors.continueButton)
    await el.waitForDisplayed({ timeout })
  }

  async enterPin(pin: string) {
    const el = await this.findByTestId(this.variant.selectors.continueButton)
    await el.setValue(pin)
  }

  async confirmPin(pin: string) {
    const el = await this.findByTestId(this.variant.selectors.continueButton)
    await el.setValue(pin)
  }

  async submitPin() {
    const el = await this.findByTestId(this.variant.selectors.continueButton)
    await el.click()
  }
}

export default new PinScreen()
