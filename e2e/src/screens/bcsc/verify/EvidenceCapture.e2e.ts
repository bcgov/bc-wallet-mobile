import { BaseScreen } from '../../BaseScreen.js'

const EvidenceCaptureTestIds = {
  MaskedCamera: 'com.ariesbifold:id/EvidenceCaptureScreenMaskedCamera',
  CancelCamera: 'com.ariesbifold:id/CancelCamera',
  TakePhoto: 'com.ariesbifold:id/TakePhoto',
  ToggleFlash: 'com.ariesbifold:id/ToggleFlash',
  UsePhoto: 'com.ariesbifold:id/UsePhoto',
  RetakePhoto: 'com.ariesbifold:id/RetakePhoto',
  Help: 'com.ariesbifold:id/Help',
}

class EvidenceCaptureE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, EvidenceCaptureTestIds.TakePhoto)
  }

  async tapCancelCamera() {
    await this.tapByTestId(EvidenceCaptureTestIds.CancelCamera)
  }

  async tapTakePhoto() {
    await this.tapByTestId(EvidenceCaptureTestIds.TakePhoto)
  }

  async tapToggleFlash() {
    await this.tapByTestId(EvidenceCaptureTestIds.ToggleFlash)
  }

  async tapUsePhoto() {
    await this.tapByTestId(EvidenceCaptureTestIds.UsePhoto)
  }

  async tapRetakePhoto() {
    await this.tapByTestId(EvidenceCaptureTestIds.RetakePhoto)
  }

  async tapHelp() {
    await this.tapByTestId(EvidenceCaptureTestIds.Help)
  }
}

export default new EvidenceCaptureE2EScreen()
