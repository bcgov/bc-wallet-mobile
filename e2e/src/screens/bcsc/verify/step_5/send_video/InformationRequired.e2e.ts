import { BaseScreen } from '../../../../BaseScreen.js'

const InformationRequiredTestIds = {
  TakePhotoAction: 'com.ariesbifold:id/Take Photo',
  RecordVideoAction: 'com.ariesbifold:id/Record Video',
  SendToServiceBCNow: 'SendToServiceBCNow',
}

class InformationRequiredE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, InformationRequiredTestIds.TakePhotoAction)
  }

  async tapTakePhoto() {
    await this.tapByTestId(InformationRequiredTestIds.TakePhotoAction)
  }

  async tapRecordVideo() {
    await this.tapByTestId(InformationRequiredTestIds.RecordVideoAction)
  }

  async tapSendToServiceBCNow() {
    await this.tapByTestId(InformationRequiredTestIds.SendToServiceBCNow)
  }
}

export default new InformationRequiredE2EScreen()
