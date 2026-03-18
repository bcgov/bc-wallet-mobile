import { TestIds } from '../../../constants.js'
import { BaseScreen } from '../../BaseScreen.js'

class SetupTypesE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.SetupTypes.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.Continue)
  }

  async tapCancel() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.Cancel)
  }

  async selectMyOwnId() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.MyOwnIdRadioGroup)
  }

  async selectSomeoneElseId() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.SomeoneElseIdRadioGroup)
  }

  async selectOtherPersonPresentYes() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.OtherPersonPresentRadioGroupYesOption)
  }

  async selectOtherPersonPresentNo() {
    await this.tapByTestId(TestIds.Onboarding.SetupTypes.OtherPersonPresentRadioGroupNoOption)
  }
}

export default new SetupTypesE2EScreen()
