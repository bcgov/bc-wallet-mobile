import { getVariantConfig } from '../variant.js'
import { BaseScreen } from './BaseScreen.js'

class OnboardingScreen extends BaseScreen {
  private variant = getVariantConfig()

  async waitForDisplayed(timeout = 20_000) {
    if (this.variant.family === 'bcsc') {
      const el = await this.findByTestId(this.variant.selectors.addAccount!)
      await el.waitForDisplayed({ timeout })
    } else {
      const el = await this.findByTestId(this.variant.selectors.agreeCheckbox!)
      await el.waitForDisplayed({ timeout })
    }
  }

  async completeOnboarding() {
    if (this.variant.family === 'bcsc') {
      await this.completeBcscOnboarding()
    } else {
      await this.completeBcWalletOnboarding()
    }
  }

  private async completeBcscOnboarding() {
    const { selectors, onboarding } = this.variant
    await this.tapByTestId(selectors.addAccount!)
    await this.tapByTestId(selectors.continueButton)
    for (let i = 0; i < onboarding.carouselSteps; i++) {
      await this.tapByTestId(selectors.carouselNext!)
    }
    await this.tapByTestId(selectors.continueButton)
  }

  private async completeBcWalletOnboarding() {
    const { selectors } = this.variant
    await this.tapByTestId(selectors.agreeCheckbox!)
    await this.tapByTestId(selectors.continueButton)
  }
}

export default new OnboardingScreen()
