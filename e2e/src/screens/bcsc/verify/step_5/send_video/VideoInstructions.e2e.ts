import { BaseScreen } from '../../../../BaseScreen.js'

const VideoInstructionsTestIds = {
  StartRecordingButton: 'StartRecordingButton',
}

class VideoInstructionsE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VideoInstructionsTestIds.StartRecordingButton)
  }

  async tapStartRecording() {
    await this.tapByTestId(VideoInstructionsTestIds.StartRecordingButton)
  }
}

export default new VideoInstructionsE2EScreen()
