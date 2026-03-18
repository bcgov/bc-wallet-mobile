import { BaseScreen } from '../../BaseScreen.js'

const ResidentialAddressTestIds = {
  Continue: 'com.ariesbifold:id/ResidentialAddressContinue',
  StreetAddress1Input: 'com.ariesbifold:id/streetAddress1-input',
  StreetAddress2Input: 'com.ariesbifold:id/streetAddress2-input',
  CityInput: 'com.ariesbifold:id/city-input',
  ProvinceInput: 'com.ariesbifold:id/province-input',
  PostalCodeInput: 'com.ariesbifold:id/postalCode-input',
}

class ResidentialAddressE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ResidentialAddressTestIds.Continue)
  }

  async enterStreetAddress1(address: string) {
    await this.enterText(ResidentialAddressTestIds.StreetAddress1Input, address, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterStreetAddress2(address: string) {
    await this.enterText(ResidentialAddressTestIds.StreetAddress2Input, address, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterCity(city: string) {
    await this.enterText(ResidentialAddressTestIds.CityInput, city, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async tapProvince() {
    await this.tapByTestId(ResidentialAddressTestIds.ProvinceInput)
  }

  async enterPostalCode(postalCode: string) {
    await this.enterText(ResidentialAddressTestIds.PostalCodeInput, postalCode, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async tapContinue() {
    await this.tapByTestId(ResidentialAddressTestIds.Continue)
  }
}

export default new ResidentialAddressE2EScreen()
