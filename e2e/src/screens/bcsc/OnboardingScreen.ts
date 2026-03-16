import { getVariantConfig } from '../../variant.js'
import { BaseScreen } from '../BaseScreen.js'

class OnboardingScreen extends BaseScreen {
  private variant = getVariantConfig()

  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, this.variant.selectors.addAccount!)
  }

  async completeOnboarding() {
    const { selectors, onboarding } = this.variant
    await this.tapByTestId(selectors.addAccount!)
    await this.tapByTestId(selectors.continueButton)
    for (let i = 0; i < onboarding.carouselSteps; i++) {
      await this.tapByTestId(selectors.carouselNext!)
    }
    await this.tapByTestId(selectors.continueButton)
  }
}

export default new OnboardingScreen()
