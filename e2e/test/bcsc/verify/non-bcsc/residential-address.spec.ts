import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const ResidentialAddress = new BaseScreen(BCSC_TestIDs.ResidentialAddress)

describe('Residential Address', () => {
  it('should navigate to the residential address form', async () => {
    await SetupSteps.tap('Step3')
  })

  it('should fill out the residential address form', async () => {
    await ResidentialAddress.type('StreetAddress1Input', '123 Main St')
    await ResidentialAddress.type('StreetAddress2Input', 'Apt 4B')
    await ResidentialAddress.type('CityInput', 'Victoria')
    await ResidentialAddress.dismissKeyboard()
    await ResidentialAddress.tap('ProvinceInput')
    if (driver.isIOS) {
      await driver.pause(500)
      const opt = await ResidentialAddress.findByText('British\u00A0Columbia\u00A0(BC)')
      await opt.waitForDisplayed({ timeout: 10000 })
      await opt.click()
    } else {
      await ResidentialAddress.waitFor('ProvinceOptionBritishColumbia')
      await ResidentialAddress.tap('ProvinceOptionBritishColumbia')
    }
    await ResidentialAddress.type('PostalCodeInput', 'V8W 2Y2')
    await ResidentialAddress.tap('Continue')
  })
})
