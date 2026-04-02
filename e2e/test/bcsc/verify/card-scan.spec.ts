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
const EnterBirthdate = new BaseScreen(BCSC_TestIDs.EnterBirthdate)
const SetupStepsPostScan = new BaseScreen(BCSC_TestIDs.SetupSteps)

const { testUser } = getVerifyContext()
const { cardScanImage } = testUser

/** Combo scan resets to Setup Steps; serial-only scan opens Enter Birthdate. */
async function waitForPostBarcodeScanScreen() {
  await driver.waitUntil(
    async () => {
      for (const testId of [EnterBirthdate.ids.BirthdateInput, SetupStepsPostScan.ids.Step1]) {
        const el = await $(driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`)
        if (await el.isDisplayed().catch(() => false)) {
          return true
        }
      }
      return false
    },
    {
      timeout: 90_000,
      interval: 500,
      timeoutMsg: 'Expected Enter Birthdate or Setup Steps after scan (combo vs serial-only card image).',
    }
  )
}

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
    await acceptSystemAlert()
  })

  it('should inject the card image, tap to focus the barcode region, and complete the scan', async function () {
    await injectPhoto(cardScanImage)
    await ScanSerial.waitFor('EnterManually', Timeouts.screenTransition)
    await tapAtWindowPercent(SCAN_SERIAL_TAP_FOCUS_WINDOW.x, SCAN_SERIAL_TAP_FOCUS_WINDOW.y)
    await driver.pause(400)

    await waitForPostBarcodeScanScreen()
  })
})
