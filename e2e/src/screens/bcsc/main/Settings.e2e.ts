import { BaseScreen } from '../../BaseScreen.js'

const SettingsTestIds = {
  SignOut: 'com.ariesbifold:id/SignOut',
  AppSecurity: 'com.ariesbifold:id/AppSecurity',
  ChangePIN: 'com.ariesbifold:id/ChangePIN',
  EditNickname: 'com.ariesbifold:id/EditNickname',
  AutoLock: 'com.ariesbifold:id/AutoLock',
  ForgetPairings: 'com.ariesbifold:id/ForgetPairings',
  AnalyticsOptIn: 'com.ariesbifold:id/AnalyticsOptIn',
  RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
  Help: 'com.ariesbifold:id/Help',
  Privacy: 'com.ariesbifold:id/Privacy',
  ContactUs: 'com.ariesbifold:id/ContactUs',
  Feedback: 'com.ariesbifold:id/Feedback',
  Accessibility: 'com.ariesbifold:id/Accessibility',
  TermsOfUse: 'com.ariesbifold:id/TermsOfUse',
  Analytics: 'com.ariesbifold:id/Analytics',
  DeveloperMode: 'com.ariesbifold:id/DeveloperMode',
}

class SettingsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, SettingsTestIds.ContactUs)
  }

  async tapContactUs() {
    await this.tapByTestId(SettingsTestIds.ContactUs)
  }

  async tapHelp() {
    await this.tapByTestId(SettingsTestIds.Help)
  }

  async tapPrivacy() {
    await this.tapByTestId(SettingsTestIds.Privacy)
  }

  async tapEditNickname() {
    await this.tapByTestId(SettingsTestIds.EditNickname)
  }

  async tapForgetAllPairings() {
    await this.tapByTestId(SettingsTestIds.ForgetPairings)
  }

  async tapAutoLock() {
    await this.tapByTestId(SettingsTestIds.AutoLock)
  }

  async tapChangeAppSecurity() {
    await this.tapByTestId(SettingsTestIds.AppSecurity)
  }

  async tapChangePIN() {
    await this.tapByTestId(SettingsTestIds.ChangePIN)
  }

  async tapRemoveAccount() {
    await this.tapByTestId(SettingsTestIds.RemoveAccount)
  }

  async tapDeveloperMode() {
    await this.tapByTestId(SettingsTestIds.DeveloperMode)
  }

  async tapAnalyticsOptIn() {
    await this.tapByTestId(SettingsTestIds.AnalyticsOptIn)
  }

  async tapAnalytics() {
    await this.tapByTestId(SettingsTestIds.Analytics)
  }

  async tapTermsOfUse() {
    await this.tapByTestId(SettingsTestIds.TermsOfUse)
  }

  async tapFeedback() {
    await this.tapByTestId(SettingsTestIds.Feedback)
  }

  async tapAccessibility() {
    await this.tapByTestId(SettingsTestIds.Accessibility)
  }

  async tapSignOut() {
    await this.tapByTestId(SettingsTestIds.SignOut)
  }
}

export default new SettingsE2EScreen()
