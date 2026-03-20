import { BaseScreen } from '../../../../BaseScreen.js'

const EvidenceTypeListTestIds = {
  OtherOptions: 'com.ariesbifold:id/EvidenceTypeListOtherOptions',
  Help: 'com.ariesbifold:id/Help',
}

class EvidenceTypeListE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EvidenceTypeListTestIds.Help)
  }

  /** Evidence type items have dynamic testIDs: `com.ariesbifold:id/EvidenceTypeListItem <label>` */
  async tapEvidenceType(label: string) {
    await this.tapByTestId(`com.ariesbifold:id/EvidenceTypeListItem ${label}`)
  }

  async tapOtherOptions() {
    await this.tapByTestId(EvidenceTypeListTestIds.OtherOptions)
  }

  async tapHelp() {
    await this.tapByTestId(EvidenceTypeListTestIds.Help)
  }
}

export default new EvidenceTypeListE2EScreen()
