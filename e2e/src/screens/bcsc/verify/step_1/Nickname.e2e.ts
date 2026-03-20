import { BaseScreen } from '../../BaseScreen.js'

const NicknameTestIds = {
  NameInput: 'com.ariesbifold:id/NameInput',
  SaveAndContinue: 'com.ariesbifold:id/SaveAndContinue',
  Back: 'com.ariesbifold:id/Back',
}

class NicknameE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, NicknameTestIds.SaveAndContinue)
  }

  async enterName(name: string) {
    await this.enterText(NicknameTestIds.NameInput, name, {
      tapFirst: true,
    })
  }

  async tapSaveAndContinue() {
    await this.tapByTestId(NicknameTestIds.SaveAndContinue)
  }

  async tapBack() {
    await this.tapByTestId(NicknameTestIds.Back)
  }
}

export default new NicknameE2EScreen()
