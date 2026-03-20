import { BaseScreen } from '../../../../BaseScreen.js'

const TakeVideoTestIds = {
  StartRecordingButton: 'StartRecordingButton',
}

class TakeVideoE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TakeVideoTestIds.StartRecordingButton)
  }

  async tapNextPromptOrDone() {
    await this.tapByTestId(TakeVideoTestIds.StartRecordingButton)
  }
}

export default new TakeVideoE2EScreen()
