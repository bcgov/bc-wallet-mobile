import { BaseScreen } from '../../BaseScreen.js'

const VerificationMethodSelectionTestIds = {
  SendVideo: 'com.ariesbifold:id/Send a video',
  VideoCall: 'com.ariesbifold:id/Video call',
  InPerson: 'com.ariesbifold:id/In person',
  Help: 'com.ariesbifold:id/Help',
}

class VerificationMethodSelectionE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VerificationMethodSelectionTestIds.Help)
  }

  async tapSendVideo() {
    await this.tapByTestId(VerificationMethodSelectionTestIds.SendVideo)
  }

  async tapVideoCall() {
    await this.tapByTestId(VerificationMethodSelectionTestIds.VideoCall)
  }

  async tapInPerson() {
    await this.tapByTestId(VerificationMethodSelectionTestIds.InPerson)
  }

  async tapHelp() {
    await this.tapByTestId(VerificationMethodSelectionTestIds.Help)
  }
}

export default new VerificationMethodSelectionE2EScreen()
