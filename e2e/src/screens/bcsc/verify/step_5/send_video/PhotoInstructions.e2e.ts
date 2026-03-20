import { BaseScreen } from '../../../../BaseScreen.js'

const PhotoInstructionsTestIds = {
  TakePhotoButton: 'TakePhotoButton',
}

class PhotoInstructionsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PhotoInstructionsTestIds.TakePhotoButton)
  }

  async tapTakePhoto() {
    await this.tapByTestId(PhotoInstructionsTestIds.TakePhotoButton)
  }
}

export default new PhotoInstructionsE2EScreen()
