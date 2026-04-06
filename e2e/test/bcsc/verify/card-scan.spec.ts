import { SCAN_SERIAL_TAP_FOCUS_WINDOW, Timeouts } from '../../../src/constants.js'
import { acceptSystemAlert } from '../../../src/helpers/alerts.js'
import { injectPhoto } from '../../../src/helpers/camera.js'
import { tapAtWindowPercent } from '../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'
import { getVerifyContext } from './card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ScanSerial = new BaseScreen(BCSC_TestIDs.ScanSerial)

const { testUser } = getVerifyContext()
const { cardScanImage } = testUser

describe(`BCSC ${getVerifyContext().cardTypeLabel} Card Scan`, () => {
  it('should navigate through the Setup Steps screen and tap Step 2', async () => {
    await SetupSteps.waitFor('Step2')
    await SetupSteps.tap('Step2')
  })

  it('should navigate through the Identity screen and select card type', async () => {
    const { cardTypeButton } = getVerifyContext()
    await IdentitySelection.waitFor(cardTypeButton)
    await IdentitySelection.tap(cardTypeButton)
  })

  it('should navigate through the Serial Instructions screen and tap Scan Barcode', async () => {
    await SerialInstructions.waitFor('ScanBarcode', 10_000)
    await SerialInstructions.tap('ScanBarcode')
    await injectPhoto(cardScanImage)
    await acceptSystemAlert()
  })

  it('should inject the card image repeatedly until the barcode scan completes', async function () {
    await ScanSerial.waitFor('EnterManually', Timeouts.screenTransition)
    await tapAtWindowPercent(SCAN_SERIAL_TAP_FOCUS_WINDOW.x, SCAN_SERIAL_TAP_FOCUS_WINDOW.y)
  })
})
