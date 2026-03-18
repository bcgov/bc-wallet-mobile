import { BaseScreen } from '../../BaseScreen.js'

const VideoReviewTestIds = {
  UseVideo: 'com.ariesbifold:id/UseVideo',
  RetakeVideo: 'com.ariesbifold:id/RetakeVideo',
  TogglePlayPause: 'com.ariesbifold:id/TogglePlayPause',
}

class VideoReviewE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, VideoReviewTestIds.UseVideo)
  }

  async tapUseVideo() {
    await this.tapByTestId(VideoReviewTestIds.UseVideo)
  }

  async tapRetakeVideo() {
    await this.tapByTestId(VideoReviewTestIds.RetakeVideo)
  }

  async tapTogglePlayPause() {
    await this.tapByTestId(VideoReviewTestIds.TogglePlayPause)
  }
}

export default new VideoReviewE2EScreen()
