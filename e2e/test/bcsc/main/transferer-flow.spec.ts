import { Timeouts } from '../../../src/constants.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TabBar = new BaseScreen(BCSC_TestIDs.TabBar)
const Home = new BaseScreen(BCSC_TestIDs.Home)
const Account = new BaseScreen(BCSC_TestIDs.Account)
const TransferAccountQRInformation = new BaseScreen(BCSC_TestIDs.TransferAccountQRInformation)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const TransferAccountQRDisplay = new BaseScreen(BCSC_TestIDs.TransferAccountQRDisplay)

describe('Transfer Flow', () => {
  it('should navigate through the Home tab and to the Account tab', async () => {
    await TabBar.waitFor('Home')
    await Home.waitFor('SettingsMenuButton')
    await TabBar.tap('Account')
  })

  it('should navigate through the Account tab and click the transfer account button', async () => {
    await Account.waitFor('TransferAccount')
    await Account.tap('TransferAccount')
  })

  it('should navigate to the learn more screen and return', async () => {
    await TransferAccountQRInformation.waitFor('LearnMoreButton')
    await TransferAccountQRInformation.tap('LearnMoreButton')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('should navigate to the QR code screen', async () => {
    await TransferAccountQRInformation.waitFor('GetQRCodeButton')
    await TransferAccountQRInformation.tap('GetQRCodeButton')
  })

  it('should display the QR code and click the new QR code button', async () => {
    await TransferAccountQRDisplay.waitFor('GetNewQRCode')
    await TransferAccountQRDisplay.tap('GetNewQRCode')

    await TransferAccountQRDisplay.waitFor('GetNewQRCode')
    await TransferAccountQRDisplay.tap('GetNewQRCode')
  })

  it('should navigate back to the home screen', async () => {
    await TransferAccountQRDisplay.waitFor('Back')
    await TransferAccountQRDisplay.tap('Back')

    await TransferAccountQRInformation.waitFor('Back')
    await TransferAccountQRInformation.tap('Back')

    await TabBar.waitFor('Home')
    await TabBar.tap('Home')
    await Home.waitFor('LogInFromComputer')
  })
})
