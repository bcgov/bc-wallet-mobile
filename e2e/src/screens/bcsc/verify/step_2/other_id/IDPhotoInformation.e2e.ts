import { BaseScreen } from '../../../../BaseScreen.js'

const IDPhotoInformationTestIds = {
  TakePhoto: 'com.ariesbifold:id/IDPhotoInformationTakePhoto',
  Help: 'com.ariesbifold:id/Help',
}

class IDPhotoInformationE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, IDPhotoInformationTestIds.TakePhoto)
  }

  async tapTakePhoto() {
    await this.tapByTestId(IDPhotoInformationTestIds.TakePhoto)
  }

  async tapHelp() {
    await this.tapByTestId(IDPhotoInformationTestIds.Help)
  }
}

export default new IDPhotoInformationE2EScreen()
