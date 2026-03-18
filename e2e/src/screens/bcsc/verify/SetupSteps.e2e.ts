import { BaseScreen } from '../../BaseScreen.js'

const SetupStepsTestIds = {
  Step1: 'com.ariesbifold:id/Step 1',
  Step2: 'com.ariesbifold:id/Step 2',
  Step3: 'com.ariesbifold:id/Step 3',
  Step4: 'com.ariesbifold:id/Step 4',
  EditEmail: 'com.ariesbifold:id/EditEmail',
  Step5: 'com.ariesbifold:id/Step 5',
  SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
  Help: 'com.ariesbifold:id/Help',
}

class SetupStepsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SetupStepsTestIds.Step1)
  }

  async tapStep1() {
    await this.tapByTestId(SetupStepsTestIds.Step1)
  }

  async tapStep2() {
    await this.tapByTestId(SetupStepsTestIds.Step2)
  }

  async tapStep3() {
    await this.tapByTestId(SetupStepsTestIds.Step3)
  }

  async tapStep4() {
    await this.tapByTestId(SetupStepsTestIds.Step4)
  }

  async tapEditEmail() {
    await this.tapByTestId(SetupStepsTestIds.EditEmail)
  }

  async tapStep5() {
    await this.tapByTestId(SetupStepsTestIds.Step5)
  }

  async tapSettingsMenuButton() {
    await this.tapByTestId(SetupStepsTestIds.SettingsMenuButton)
  }

  async tapHelp() {
    await this.tapByTestId(SetupStepsTestIds.Help)
  }
}

export default new SetupStepsE2EScreen()
