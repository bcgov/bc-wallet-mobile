import { BaseScreen } from '../../BaseScreen.js'

const ServiceLoginTestIds = {
  GoToServiceClient: 'com.ariesbifold:id/GoToServiceClient',
  ReportSuspiciousLink: 'com.ariesbifold:id/ReportSuspiciousLink',
  HelpButton: 'com.ariesbifold:id/HelpButton',
  ReadPrivacyPolicy: 'com.ariesbifold:id/ReadPrivacyPolicy',
  ServiceLoginContinue: 'com.ariesbifold:id/ServiceLoginContinue',
  ServiceLoginCancel: 'com.ariesbifold:id/ServiceLoginCancel',
}

class ServiceLoginE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, ServiceLoginTestIds.ServiceLoginContinue)
  }

  async tapContinue() {
    await this.tapByTestId(ServiceLoginTestIds.ServiceLoginContinue)
  }

  async tapCancel() {
    await this.tapByTestId(ServiceLoginTestIds.ServiceLoginCancel)
  }

  async tapGoToServiceClient() {
    await this.tapByTestId(ServiceLoginTestIds.GoToServiceClient)
  }

  async tapReportSuspicious() {
    await this.tapByTestId(ServiceLoginTestIds.ReportSuspiciousLink)
  }

  async tapHelp() {
    await this.tapByTestId(ServiceLoginTestIds.HelpButton)
  }

  async tapReadPrivacyPolicy() {
    await this.tapByTestId(ServiceLoginTestIds.ReadPrivacyPolicy)
  }
}

export default new ServiceLoginE2EScreen()
