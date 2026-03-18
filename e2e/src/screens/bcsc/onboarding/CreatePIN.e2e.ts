import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class CreatePINE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.CreatePIN.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(TestIds.Onboarding.CreatePIN.Continue)
  }

  async tapIUnderstand() {
    await this.tapByTestId(TestIds.Onboarding.CreatePIN.IUnderstand)
  }

  async tapVisibilityButtons() {
    await this.tapByTestId(TestIds.Onboarding.CreatePIN.PINInput1VisibilityButton)
    await this.tapByTestId(TestIds.Onboarding.CreatePIN.PINInput2VisibilityButton)
  }

  async enterPIN1(pin: string) {
    await this.enterText(TestIds.Onboarding.CreatePIN.PINInput1, pin, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterPIN2(pin: string) {
    await this.enterText(TestIds.Onboarding.CreatePIN.PINInput2, pin, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }
}

export default new CreatePINE2EScreen()
