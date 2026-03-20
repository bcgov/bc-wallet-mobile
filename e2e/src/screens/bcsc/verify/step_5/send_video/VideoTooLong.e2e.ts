import { BaseScreen } from '../../../../BaseScreen.js'

const VideoTooLongTestIds = {
  Cancel: 'Cancel',
}

class VideoTooLongE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VideoTooLongTestIds.Cancel)
  }

  async tapCancel() {
    await this.tapByTestId(VideoTooLongTestIds.Cancel)
  }
}

export default new VideoTooLongE2EScreen()
