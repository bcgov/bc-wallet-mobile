import { BaseScreen } from '../../../BaseScreen.js'

const EditNicknameTestIds = {
  NameInput: 'com.ariesbifold:id/NameInput',
  SaveAndContinue: 'com.ariesbifold:id/SaveAndContinue',
}

class EditNicknameE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EditNicknameTestIds.SaveAndContinue)
  }

  async enterName(name: string) {
    await this.enterText(EditNicknameTestIds.NameInput, name, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async tapSaveAndContinue() {
    await this.tapByTestId(EditNicknameTestIds.SaveAndContinue)
  }
}

export default new EditNicknameE2EScreen()
