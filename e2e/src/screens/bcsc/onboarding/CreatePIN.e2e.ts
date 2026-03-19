import { BaseScreen } from '../../BaseScreen.js'

export const CreatePINTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
  IUnderstand: 'com.ariesbifold:id/IUnderstand',
  PINInput1: 'com.ariesbifold:id/PINInput1',
  PINInput2: 'com.ariesbifold:id/PINInput2',
  PINInput1VisibilityButton: 'com.ariesbifold:id/PINInput1VisibilityButton',
  PINInput2VisibilityButton: 'com.ariesbifold:id/PINInput2VisibilityButton',
  Back: 'com.ariesbifold:id/Back',
}

class CreatePINE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, CreatePINTestIds.PINInput1)
  }

  async tapContinue() {
    await this.tapByTestId(CreatePINTestIds.Continue)
  }

  async tapIUnderstand() {
    await this.tapByTestId(CreatePINTestIds.IUnderstand)
  }

  async tapVisibilityButtons() {
    await this.tapByTestId(CreatePINTestIds.PINInput1VisibilityButton)
    await this.tapByTestId(CreatePINTestIds.PINInput2VisibilityButton)
  }

  async enterPIN1(pin: string) {
    await this.enterText(CreatePINTestIds.PINInput1, pin, {
      tapFirst: true,
    })
  }

  async enterPIN2(pin: string) {
    await this.enterText(CreatePINTestIds.PINInput2, pin, {
      tapFirst: true,
    })
  }

  async tapBack() {
    await this.tapByTestId(CreatePINTestIds.Back)
  }
}

export default new CreatePINE2EScreen()
