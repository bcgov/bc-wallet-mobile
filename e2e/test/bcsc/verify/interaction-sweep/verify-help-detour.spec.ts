/**
 * Step 2 → IdentitySelection → SerialInstructions.Help WebView round-trip.
 * Pre: SetupSteps anchor. Post: SetupSteps anchor (next spec re-enters Step 2).
 */
import { Timeouts } from '../../../../src/constants.js'
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { getCurrentAppId } from '../../../../src/helpers/deep-link.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ScanSerial = new BaseScreen(BCSC_TestIDs.ScanSerial)
const WebView = new BaseScreen(BCSC_TestIDs.WebView)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const DualIDRequired = new BaseScreen(BCSC_TestIDs.DualIdentificationRequired)

describe('SerialInstructions Help detour', () => {
  it('opens Combo card and SerialInstructions', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
    await IdentitySelection.waitFor('CombinedCard')
    await IdentitySelection.tap('CombinedCard')
    await SerialInstructions.waitFor('Help')
  })

  it('opens SerialInstructions Help WebView and returns', async () => {
    await SerialInstructions.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await SerialInstructions.waitFor('ScanBarcode')
  })

  it('opens ScanSerial and Help WebView, then returns twice to SerialInstructions', async () => {
    await SerialInstructions.tap('ScanBarcode')
    await acceptSystemAlert() // allow camera permission
    await ScanSerial.waitFor('Help')
    await ScanSerial.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
    await ScanSerial.waitFor('Back')
    await ScanSerial.tap('Back')
    await SerialInstructions.waitFor('EnterManually')
  })

  it('opens ManualSerial Help WebView and returns again', async () => {
    await SerialInstructions.tap('EnterManually')
    await ManualSerial.waitFor('Help')
    await ManualSerial.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('returns to SetupSteps so the next detour can re-enter cleanly', async () => {
    await ManualSerial.waitFor('Back')
    await ManualSerial.tap('Back') // ManualSerial → SerialInstructions
    await SerialInstructions.waitFor('Back')
    await SerialInstructions.tap('Back') // SerialInstructions → IdentitySelection
    await IdentitySelection.waitFor('Back')
    await IdentitySelection.tap('Back') // IdentitySelection → SetupSteps
    await SetupSteps.waitFor('Step2')
  })
})

describe('ManualSerial Help detour', () => {
  it('enters Step 2 → CheckForServicesCard', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
    await IdentitySelection.waitFor('CheckForServicesCard')
    await IdentitySelection.tap('CheckForServicesCard')
    await WebView.waitFor('Back')
    await WebView.tap('Back')
  })

  it('enters non-bcsc card flow and Help WebView', async () => {
    await IdentitySelection.waitFor('OtherID')
    await IdentitySelection.tap('OtherID')

    await DualIDRequired.waitFor('Help')
    await DualIDRequired.tap('Help')
    await WebView.waitFor('Back')
    await WebView.tap('Back')

    await DualIDRequired.waitFor('OpenAccountServices')
    const appId = await getCurrentAppId()
    await DualIDRequired.tap('OpenAccountServices')
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await driver.activateApp(appId)

    await DualIDRequired.waitFor('Back')
  })

  it('returns to SetupSteps for the next detour', async () => {
    await DualIDRequired.tap('Back') // DualIDRequired → IdentitySelection
    await IdentitySelection.waitFor('Back')
    await IdentitySelection.tap('Back') // IdentitySelection → SetupSteps
    await SetupSteps.waitFor('Step2')
  })
})
