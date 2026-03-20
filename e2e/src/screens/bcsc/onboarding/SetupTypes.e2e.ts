import { BaseScreen } from '../../BaseScreen.js'

const SetupTypesTestIds = {
  Continue: 'com.ariesbifold:id/Continue',
  Cancel: 'com.ariesbifold:id/Cancel',
  MyOwnIdRadioGroup: 'com.ariesbifold:id/MyOwnIdRadioGroup-option-MyOwnID',
  SomeoneElseIdRadioGroup: "com.ariesbifold:id/MyOwnIdRadioGroup-option-SomeoneElse'sID",
  OtherPersonPresentRadioGroupYesOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-Yes',
  OtherPersonPresentRadioGroupNoOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-No',
  Back: 'com.ariesbifold:id/Back',
}

class SetupTypesE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SetupTypesTestIds.Continue)
  }

  async tapContinue() {
    await this.tapByTestId(SetupTypesTestIds.Continue)
  }

  async tapCancel() {
    await this.tapByTestId(SetupTypesTestIds.Cancel)
  }

  async selectMyOwnId() {
    await this.tapByTestId(SetupTypesTestIds.MyOwnIdRadioGroup)
  }

  async selectSomeoneElseId() {
    await this.tapByTestId(SetupTypesTestIds.SomeoneElseIdRadioGroup)
  }

  async selectOtherPersonPresentYes() {
    await this.tapByTestId(SetupTypesTestIds.OtherPersonPresentRadioGroupYesOption)
  }

  async selectOtherPersonPresentNo() {
    await this.tapByTestId(SetupTypesTestIds.OtherPersonPresentRadioGroupNoOption)
  }

  async tapBack() {
    await this.tapByTestId(SetupTypesTestIds.Back)
  }
}

export default new SetupTypesE2EScreen()
