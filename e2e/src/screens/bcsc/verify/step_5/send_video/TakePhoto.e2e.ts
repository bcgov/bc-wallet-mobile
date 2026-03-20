import { BaseScreen } from '../../../../BaseScreen.js'

const TakePhotoTestIds = {
  CancelCamera: 'com.ariesbifold:id/CancelCamera',
  TakePhoto: 'com.ariesbifold:id/TakePhoto',
  ToggleFlash: 'com.ariesbifold:id/ToggleFlash',
}

class TakePhotoE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TakePhotoTestIds.TakePhoto)
  }

  async tapCancelCamera() {
    await this.tapByTestId(TakePhotoTestIds.CancelCamera)
  }

  async tapTakePhoto() {
    await this.tapByTestId(TakePhotoTestIds.TakePhoto)
  }

  async tapToggleFlash() {
    await this.tapByTestId(TakePhotoTestIds.ToggleFlash)
  }
}

export default new TakePhotoE2EScreen()
