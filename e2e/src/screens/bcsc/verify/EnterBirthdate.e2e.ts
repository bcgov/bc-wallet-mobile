import { BaseScreen } from '../../BaseScreen.js'

const EnterBirthdateTestIds = {
  BirthdateInput: 'com.ariesbifold:id/birthDate-input',
  Done: 'com.ariesbifold:id/Done',
}

class EnterBirthdateE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EnterBirthdateTestIds.Done)
  }

  async enterBirthdate(date: string) {
    await this.enterText(EnterBirthdateTestIds.BirthdateInput, date, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async tapDone() {
    await this.tapByTestId(EnterBirthdateTestIds.Done)
  }
}

export default new EnterBirthdateE2EScreen()
