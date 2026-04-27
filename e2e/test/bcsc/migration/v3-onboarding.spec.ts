import { Timeouts } from '../../../src/constants.js'
import { acceptSystemAlert } from '../../../src/helpers/alerts.js'
import { approveInPersonRequest } from '../../../src/helpers/approval.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { V3 } from '../../../src/v3TestIDs.js'
import { migrationContext } from './migration-context.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format DOB from "YYYYMMDD" to individual components for date picker. */
function parseDob(dob: string) {
  const y = dob.slice(0, 4)
  const m = parseInt(dob.slice(4, 6), 10)
  const d = parseInt(dob.slice(6, 8), 10)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return { year: y, monthShort: months[m - 1].slice(0, 3), monthFull: months[m - 1], day: String(d) }
}

const testUser = migrationContext.user

/**
 * Click the arrow button on an Android NumberPicker until the EditText shows the target value.
 * Automatically chooses the faster direction (increment or decrement).
 * @param picker  The NumberPicker element
 * @param target  The text value to reach (e.g. "Dec", "17", "1995")
 */
async function scrollNumberPickerTo(
  picker: ChainablePromiseElement | WebdriverIO.Element,
  target: string,
  maxClicks = 100
) {
  const resolved = await Promise.resolve(picker)
  const editText = await resolved.$('android.widget.EditText')
  const buttons = await resolved.$$('android.widget.Button')
  const decrementBtn = buttons[0]
  const incrementBtn = buttons[1]

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  function calculateDistance(current: string, target: string): { increment: number; decrement: number } {
    if (current === target) return { increment: 0, decrement: 0 }

    // Check if values are months
    const currentMonthIdx = months.indexOf(current)
    const targetMonthIdx = months.indexOf(target)

    if (currentMonthIdx !== -1 && targetMonthIdx !== -1) {
      // Circular distance for months (12 total)
      const forward = (targetMonthIdx - currentMonthIdx + 12) % 12 || 12
      const backward = (currentMonthIdx - targetMonthIdx + 12) % 12 || 12
      return { increment: forward, decrement: backward }
    }

    // Try parsing as numbers (days, years)
    const curNum = parseInt(current, 10)
    const targetNum = parseInt(target, 10)

    if (!isNaN(curNum) && !isNaN(targetNum)) {
      // For days (1-31), use circular distance
      if (curNum >= 1 && curNum <= 31 && targetNum >= 1 && targetNum <= 31) {
        const forward = (targetNum - curNum + 31) % 31 || 31
        const backward = (curNum - targetNum + 31) % 31 || 31
        return { increment: forward, decrement: backward }
      } else {
        // For other numbers (years), use linear distance
        const forward = targetNum >= curNum ? targetNum - curNum : targetNum - curNum + 10000
        const backward = curNum >= targetNum ? curNum - targetNum : curNum - targetNum + 10000
        return { increment: forward, decrement: backward }
      }
    }

    return { increment: maxClicks, decrement: maxClicks }
  }

  for (let i = 0; i < maxClicks; i++) {
    const cur = await editText.getText()
    if (cur === target) return

    const { increment, decrement } = calculateDistance(cur, target)
    const btn = increment <= decrement ? incrementBtn : decrementBtn
    await btn.click()
  }

  throw new Error(`NumberPicker did not reach "${target}" after ${maxClicks} clicks`)
}

describe('V3 Add Card', () => {
  it('should tap the Add Card / Setup button', async () => {
    await annotate('Migration: V3 onboarding')
    const addCard = await V3.Initial.addCard()
    await addCard.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await addCard.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await addCard.click()
  })

  it('should complete the tutorial carousel', async () => {
    const numPages = 3
    for (let i = 0; i < numPages; i++) {
      try {
        const nextBtn = await V3.Tutorial.next()
        await nextBtn.waitForDisplayed({ timeout: 5_000 })
        await nextBtn.waitForEnabled({ timeout: 5_000 })
        await nextBtn.click()
      } catch {
        break
      }
    }
  })

  // this is the one that it gets stuck on
  it('should advance past the "New setup" intro page', async () => {
    const continueBtn = await V3.NewSetup.continue()
    await continueBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await continueBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await continueBtn.click()
  })

  it('should enable notifications', async () => {
    if (driver.isIOS) {
      const enableBtn = await V3.Notifications.continue()
      await enableBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await enableBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await enableBtn.click()

      // Tapping Continue triggers the iOS system "Allow Notifications" popup.
      // On Sauce Labs RDC the popup hangs unless we explicitly accept it via WDA.
      await acceptSystemAlert()
    } else {
      // Android doesn't show a notifications screen
    }
  })

  it('should tap Step 1', async () => {
    const step1 = await V3.SetupSteps.step1()
    await step1.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await step1.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await step1.click()
  })

  it('should accept the privacy policy', async () => {
    const continueBtn = await V3.Privacy.continue()
    await continueBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await continueBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await continueBtn.click()
  })

  it('should accept terms of use', async () => {
    const acceptBtn = await V3.Terms.acceptAndContinue()
    await acceptBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await acceptBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await acceptBtn.click()
  })

  it('should enter an account nickname', async () => {
    if (driver.isAndroid) {
      const nicknameInput = await V3.Nickname.nicknameInput()
      await nicknameInput.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await nicknameInput.click()
      await nicknameInput.setValue(testUser.username)

      const saveBtn = await V3.Nickname.saveAndContinue()
      await saveBtn.waitForDisplayed({ timeout: 5_000 })
      await saveBtn.waitForEnabled({ timeout: 5_000 })
      await saveBtn.click()
    } else {
      const nicknameField = await $('-ios class chain:**/XCUIElementTypeTextField')
      await nicknameField.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await nicknameField.click()
      await nicknameField.setValue(testUser.username)

      const saveBtn = await $(
        '-ios class chain:**/XCUIElementTypeButton[`label CONTAINS "Save" OR label CONTAINS "Continue"`]'
      )
      await saveBtn.waitForDisplayed({ timeout: 5_000 })
      await saveBtn.waitForEnabled({ timeout: 5_000 })
      await saveBtn.click()
    }
  })

  it('should tap Choose a PIN', async () => {
    const choosePinBtn = await V3.PINPrep.choosePIN()
    await choosePinBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await choosePinBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await choosePinBtn.click()
  })

  it('should create a PIN', async () => {
    const { pin } = migrationContext

    if (driver.isAndroid) {
      const choosePinInput = await V3.PINInput.choosePIN()
      await choosePinInput.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await choosePinInput.click()
      await choosePinInput.setValue(pin)

      const confirmPinInput = await V3.PINInput.confirmPIN()
      await confirmPinInput.click()
      await confirmPinInput.setValue(pin)

      const checkbox = await V3.PINInput.understandCheckbox()
      await checkbox.click()

      const saveBtn = await V3.PINInput.saveAndContinue()
      await saveBtn.click()
    } else {
      const choosePinField = await V3.PINInput.choosePIN()
      await choosePinField.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await choosePinField.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await choosePinField.click()
      for (const char of pin) {
        await choosePinField.addValue(char)
      }

      const confirmPinField = await V3.PINInput.confirmPIN()
      await confirmPinField.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await confirmPinField.click()
      for (const char of pin) {
        await confirmPinField.addValue(char)
      }

      const checkbox = await V3.PINInput.understandCheckbox()
      await checkbox.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await checkbox.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await checkbox.click()

      const saveBtn = await V3.PINInput.saveAndContinue()
      await saveBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await saveBtn.click()
    }
  })

  it('should tap Step 2', async () => {
    const step2 = await V3.SetupSteps.step2()
    await step2.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await step2.click()
  })

  it('should select the combined card type', async () => {
    const combined = await V3.CardTypeSelection.combinedCard()
    await combined.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await combined.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await combined.click()
  })

  it('should choose Enter Manually', async () => {
    const enterManually = await V3.AddCardInstructions.enterManually()
    await enterManually.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await enterManually.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await enterManually.click()
  })

  it('should enter the card serial number', async () => {
    const serialInput = await V3.ManualEntry.serialInput()
    await serialInput.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await serialInput.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await serialInput.click()
    await serialInput.setValue(testUser.cardSerial)

    const continueBtn = await V3.ManualEntry.continue()
    await continueBtn.waitForDisplayed({ timeout: 5_000 })
    await continueBtn.waitForEnabled({ timeout: 5_000 })
    await continueBtn.click()
  })

  it('should enter the birthdate', async () => {
    const dob = parseDob(testUser.dob)

    if (driver.isAndroid) {
      // Android: tap the date field to open the spinner date picker dialog
      const dateField = await V3.Birthdate.birthdateInput()
      await dateField.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await dateField.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await dateField.click()

      // Wait for the date picker dialog's NumberPickers to appear
      const pickers = await $$('android.widget.NumberPicker')
      await pickers[0].waitForDisplayed({ timeout: 5_000 })

      // Detect locale order: if first picker has alphabetic text, it's month-first
      const firstText = await pickers[0].$('android.widget.EditText').getText()
      const isMonthFirst = /^[A-Za-z]/.test(firstText)
      const monthPicker = pickers[isMonthFirst ? 0 : 1]
      const dayPicker = pickers[isMonthFirst ? 1 : 0]
      const yearPicker = pickers[2]

      await scrollNumberPickerTo(dayPicker, dob.day)
      await scrollNumberPickerTo(monthPicker, dob.monthShort)
      await scrollNumberPickerTo(yearPicker, dob.year)

      const okBtn = await V3.Birthdate.ok()
      await okBtn.waitForDisplayed({ timeout: 5_000 })
      await okBtn.waitForEnabled({ timeout: 5_000 })
      await okBtn.click()

      const validateBtn = await V3.Birthdate.validate()
      await validateBtn.waitForDisplayed({ timeout: 5_000 })
      await validateBtn.waitForEnabled({ timeout: 5_000 })
      await validateBtn.click()
    } else {
      const monthWheel = await V3.Birthdate.monthWheel()
      await monthWheel.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await monthWheel.addValue(dob.monthFull)

      const dateWheel = await V3.Birthdate.dateWheel()
      await dateWheel.addValue(dob.day)

      const yearWheel = await V3.Birthdate.yearWheel()
      await yearWheel.addValue(dob.year)

      const doneBtn = await V3.Birthdate.validate()
      await doneBtn.waitForDisplayed({ timeout: 5_000 })
      await doneBtn.waitForEnabled({ timeout: 5_000 })
      await doneBtn.click()
    }
  })

  it('should tap step 5', async () => {
    const step5 = await V3.SetupSteps.step5()
    await step5.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await step5.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await step5.click()
  })

  it('should select in-person verification', async () => {
    if (driver.isAndroid) {
      const inPersonOption = await $('android=new UiSelector().textContains("In Person")')
      await inPersonOption.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await inPersonOption.click()
    } else {
      const verifyInPerson = await V3.VerifyOptions.verifyInPerson()
      await verifyInPerson.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await verifyInPerson.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
      await verifyInPerson.click()
    }
  })

  it('should read the confirmation code and approve via SiteMinder', async () => {
    let confirmationCode: string

    if (driver.isAndroid) {
      const codeEl = await V3.VerifyInPerson.confirmationCode()
      await codeEl.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      confirmationCode = await codeEl.getText()
    } else {
      const codeEl = await $('-ios predicate string:label MATCHES "^[A-Z0-9]{4}-[A-Z0-9]{4}$"')
      await codeEl.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      confirmationCode = await codeEl.getText()
    }

    console.log(`[migration] V3 confirmation code: "${confirmationCode}"`)
    await approveInPersonRequest(confirmationCode, testUser.cardSerial, testUser.dob)
  })

  it('should tap complete button once the verification is approved and tap Ok on the "You\'re all set" screen', async () => {
    const completeBtn = await V3.VerifyInPerson.complete()
    await completeBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await completeBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await completeBtn.click()

    const okBtn = await V3.AllSet.ok()
    await okBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await okBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await okBtn.click()

    const homeBtn = await V3.Home.whereToUse()
    await homeBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await annotate('Migration: V3 onboarding + verification complete')
  })
})
