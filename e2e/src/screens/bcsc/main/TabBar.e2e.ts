import { BaseScreen } from '../../BaseScreen.js'

const TabBarTestIds = {
  Home: 'com.ariesbifold:id/Home',
  Services: 'com.ariesbifold:id/Services',
  Account: 'com.ariesbifold:id/Account',
  SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
  HelpButton: 'com.ariesbifold:id/HelpButton',
}

class TabBarE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TabBarTestIds.Home)
  }

  async tapHome() {
    await this.tapByTestId(TabBarTestIds.Home)
  }

  async tapServices() {
    await this.tapByTestId(TabBarTestIds.Services)
  }

  async tapAccount() {
    await this.tapByTestId(TabBarTestIds.Account)
  }

  async tapSettings() {
    await this.tapByTestId(TabBarTestIds.SettingsMenuButton)
  }

  async tapHelpButton() {
    await this.tapByTestId(TabBarTestIds.HelpButton)
  }
}

export default new TabBarE2EScreen()
