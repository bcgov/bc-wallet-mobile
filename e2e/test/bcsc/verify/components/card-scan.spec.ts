import { CARD_SCAN_PADDING, SCAN_SERIAL_TAP_FOCUS_WINDOW, Timeouts } from '../../../../src/constants.js'
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { injectPhoto } from '../../../../src/helpers/camera.js'
import { tapAtWindowPercent } from '../../../../src/helpers/gestures.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'
import { getVerifyContext } from '../card-type/card-context.js'

const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)
const IdentitySelection = new BaseScreen(BCSC_TestIDs.IdentitySelection)
const SerialInstructions = new BaseScreen(BCSC_TestIDs.SerialInstructions)
const ScanSerial = new BaseScreen(BCSC_TestIDs.ScanSerial)
const ManualSerial = new BaseScreen(BCSC_TestIDs.ManualSerial)
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)

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

  // Sauce Labs image injection does not work reliably with React Native camera
  // feeds, so the barcode scan may not complete. We give it a few attempts, then
  // fall back to manual CSN entry so the rest of the flow can still be verified.
  // TODO: replace with a scan hotwire once that ticket lands.
  it('should wait for the barcode scan to complete or fall back to manual entry', async function () {
    await ScanSerial.waitFor('EnterManually', Timeouts.SCREEN_TRANSITION)

    const maxAttempts = 3
    let scanSucceeded = false
    for (let i = 0; i < maxAttempts; i++) {
      await tapAtWindowPercent(SCAN_SERIAL_TAP_FOCUS_WINDOW.x, SCAN_SERIAL_TAP_FOCUS_WINDOW.y)
      const stillOnScanScreen = await ScanSerial.isDisplayed('EnterManually')
      if (!stillOnScanScreen) {
        scanSucceeded = true
        break
      }
      await driver.pause(2000)
    }

    if (!scanSucceeded) {
      await ScanSerial.tap('EnterManually')
    }
  })

  it('should enter the CSN manually if the scan did not succeed', async function () {
    const onManualScreen = await ManualSerial.isDisplayed('Continue')
    if (!onManualScreen) {
      this.skip()
      return
    }

    if (driver.isAndroid) {
      await ManualSerial.tap('SerialInput')
      await ManualSerial.type('SerialInput', testUser.cardSerial, { tapFirst: true })
    } else {
      await ManualSerial.tap('SerialPressable')
      await ManualSerial.type('SerialPressable', testUser.cardSerial, { tapFirst: true })
    }
    await ManualSerial.dismissKeyboard()
    await ManualSerial.tap('Continue')
  })

  it('should enter the birthdate if manual entry was used', async function () {
    const onBirthdateScreen = await EnterBirthdate.isDisplayed('Done')
    if (!onBirthdateScreen) {
      this.skip()
      return
    }

    if (driver.isAndroid) {
      await EnterBirthdate.tap('BirthdateInput')
      await EnterBirthdate.type('BirthdateInput', testUser.dob, { tapFirst: true })
    } else {
      await EnterBirthdate.tap('BirthdateInputPressable')
      await EnterBirthdate.type('BirthdateInputPressable', testUser.dob, { tapFirst: true })
    }
    await EnterBirthdate.dismissKeyboard()
    await EnterBirthdate.tap('Done')
  })

  it('Affirm that the Setup Steps screen is displayed', async () => {
    await SetupSteps.waitFor('Step5')
  })
})
