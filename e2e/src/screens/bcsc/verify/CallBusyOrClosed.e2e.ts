import { BaseScreen } from '../../BaseScreen.js'

const CallBusyOrClosedTestIds = {
  CallStatusTitle: 'com.ariesbifold:id/CallStatusTitle',
  HoursOfServiceTitle: 'com.ariesbifold:id/HoursOfServiceTitle',
  ReminderTitle: 'com.ariesbifold:id/ReminderTitle',
  SendVideo: 'com.ariesbifold:id/SendVideo',
  Help: 'com.ariesbifold:id/Help',
}

class CallBusyOrClosedE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, CallBusyOrClosedTestIds.SendVideo)
  }

  async tapSendVideo() {
    await this.tapByTestId(CallBusyOrClosedTestIds.SendVideo)
  }

  async tapHelp() {
    await this.tapByTestId(CallBusyOrClosedTestIds.Help)
  }
}

export default new CallBusyOrClosedE2EScreen()
