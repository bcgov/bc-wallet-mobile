import { BaseScreen } from '../../BaseScreen.js'

const HomeTestIds = {
  SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
  Help: 'com.ariesbifold:id/Help',
  WhereToUse: 'com.ariesbifold:id/WhereToUse',
  LogInFromComputer: 'com.ariesbifold:id/LogInFromComputer',
}

class HomeE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, HomeTestIds.WhereToUse)
  }

  async tapSettingsMenuButton() {
    await this.tapByTestId(HomeTestIds.SettingsMenuButton)
  }

  async tapHelp() {
    await this.tapByTestId(HomeTestIds.Help)
  }

  async tapWhereToUse() {
    await this.tapByTestId(HomeTestIds.WhereToUse)
  }

  async tapLogInFromComputer() {
    await this.tapByTestId(HomeTestIds.LogInFromComputer)
  }
}

export default new HomeE2EScreen()
