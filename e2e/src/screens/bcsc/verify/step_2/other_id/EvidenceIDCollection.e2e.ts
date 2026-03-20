import { BaseScreen } from '../../../../BaseScreen.js'

const EvidenceIDCollectionTestIds = {
  Continue: 'com.ariesbifold:id/EvidenceIDCollectionContinue',
  Cancel: 'com.ariesbifold:id/EvidenceIDCollectionCancel',
  DocumentNumberInput: 'com.ariesbifold:id/documentNumber-input',
  LastNameInput: 'com.ariesbifold:id/lastName-input',
  FirstNameInput: 'com.ariesbifold:id/firstName-input',
  MiddleNamesInput: 'com.ariesbifold:id/middleNames-input',
  BirthdateInput: 'com.ariesbifold:id/birthDate-input',
  Help: 'com.ariesbifold:id/Help',
}

class EvidenceIDCollectionE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EvidenceIDCollectionTestIds.Continue)
  }

  async enterDocumentNumber(documentNumber: string) {
    await this.enterText(EvidenceIDCollectionTestIds.DocumentNumberInput, documentNumber, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterLastName(lastName: string) {
    await this.enterText(EvidenceIDCollectionTestIds.LastNameInput, lastName, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterFirstName(firstName: string) {
    await this.enterText(EvidenceIDCollectionTestIds.FirstNameInput, firstName, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterMiddleNames(middleNames: string) {
    await this.enterText(EvidenceIDCollectionTestIds.MiddleNamesInput, middleNames, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async enterBirthdate(date: string) {
    await this.enterText(EvidenceIDCollectionTestIds.BirthdateInput, date, {
      tapFirst: true,
      characterByCharacter: true,
    })
  }

  async tapContinue() {
    await this.tapByTestId(EvidenceIDCollectionTestIds.Continue)
  }

  async tapCancel() {
    await this.tapByTestId(EvidenceIDCollectionTestIds.Cancel)
  }

  async tapHelp() {
    await this.tapByTestId(EvidenceIDCollectionTestIds.Help)
  }
}

export default new EvidenceIDCollectionE2EScreen()
