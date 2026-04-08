import { CARD_SCAN_PADDING, SCAN_SERIAL_TAP_FOCUS_WINDOW, Timeouts } from '../../../src/constants.js'
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

  it('should navigate to the scan screen and inject the card image', async () => {
    await SerialInstructions.waitFor('ScanBarcode', 10_000)
    // Queue the image before the camera feed starts — Sauce Labs replaces the
    // placeholder on the first frame.
    await injectPhoto(cardScanImage, CARD_SCAN_PADDING)
    await SerialInstructions.tap('ScanBarcode')
    await acceptSystemAlert()
    // Re-inject once after the permission dialog in case the first injection
    // was consumed by the system alert overlay rather than the camera feed.
    await injectPhoto(cardScanImage, CARD_SCAN_PADDING)
  })

  it('should wait for the barcode scan to complete', async function () {
    await ScanSerial.waitFor('EnterManually', Timeouts.screenTransition)

    // Do NOT re-inject inside this loop. The injected image persists as the
    // camera feed — every frame is identical, so the consecutive-reading
    // validation counter (3 on Android, 5 on iOS) climbs automatically.
    // Re-injecting would momentarily blank the feed, triggering
    // handleNoCodesDetected() which resets the counter to zero.
    const maxAttempts = 10
    for (let i = 0; i < maxAttempts; i++) {
      await tapAtWindowPercent(SCAN_SERIAL_TAP_FOCUS_WINDOW.x, SCAN_SERIAL_TAP_FOCUS_WINDOW.y)
      const stillOnScanScreen = await ScanSerial.isDisplayed('EnterManually')
      if (!stillOnScanScreen) break
      await driver.pause(2000)
    }
  })

  it('Affirm that the Setup Steps screen is displayed', async () => {
    await SetupSteps.waitFor('Step5')
  })
})
