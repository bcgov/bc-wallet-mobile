import { BaseScreen } from '../../../../BaseScreen.js'

const PhotoReviewTestIds = {
  UsePhoto: 'com.ariesbifold:id/UsePhoto',
  RetakePhoto: 'com.ariesbifold:id/RetakePhoto',
}

class PhotoReviewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, PhotoReviewTestIds.UsePhoto)
  }

  async tapUsePhoto() {
    await this.tapByTestId(PhotoReviewTestIds.UsePhoto)
  }

  async tapRetakePhoto() {
    await this.tapByTestId(PhotoReviewTestIds.RetakePhoto)
  }
}

export default new PhotoReviewE2EScreen()
