import { BaseScreen } from '../../../BaseScreen.js'

const ServicesTestIds = {
  Search: 'com.ariesbifold:id/search',
  ClearSearch: 'com.ariesbifold:id/clearSearch',
}

class ServicesE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ServicesTestIds.Search)
  }

  async enterSearchText(text: string) {
    await this.enterText(ServicesTestIds.Search, text)
  }

  async tapClearSearch() {
    await this.tapByTestId(ServicesTestIds.ClearSearch)
  }

  /** Tap a service by its whitespace-stripped name (locale-dependent). */
  async tapServiceButton(strippedName: string) {
    await this.tapByTestId(`com.ariesbifold:id/ServiceButton-${strippedName}`)
  }
}

export default new ServicesE2EScreen()
