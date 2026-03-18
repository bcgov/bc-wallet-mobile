import { BaseScreen } from '../../BaseScreen.js'

const LiveCallTestIds = {
  Mute: 'com.ariesbifold:id/Mute',
  Video: 'com.ariesbifold:id/Video',
  EndCall: 'com.ariesbifold:id/EndCall',
  Cancel: 'com.ariesbifold:id/Cancel',
  TryAgain: 'com.ariesbifold:id/TryAgain',
  GoBack: 'com.ariesbifold:id/GoBack',
}

class LiveCallE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, LiveCallTestIds.EndCall)
  }

  async tapMute() {
    await this.tapByTestId(LiveCallTestIds.Mute)
  }

  async tapVideo() {
    await this.tapByTestId(LiveCallTestIds.Video)
  }

  async tapEndCall() {
    await this.tapByTestId(LiveCallTestIds.EndCall)
  }

  async tapCancel() {
    await this.tapByTestId(LiveCallTestIds.Cancel)
  }

  async tapTryAgain() {
    await this.tapByTestId(LiveCallTestIds.TryAgain)
  }

  async tapGoBack() {
    await this.tapByTestId(LiveCallTestIds.GoBack)
  }
}

export default new LiveCallE2EScreen()
