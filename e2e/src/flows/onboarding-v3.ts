import { TestUsers, Timeouts } from '../constants.js'
import { acceptSystemAlert } from '../helpers/alerts.js'
import { V3 } from '../v3TestIDs.js'

/**
 * Driving steps for the legacy native v3 app (`BCSC-v3.*`), one per screen, over the raw selectors in
 * `v3TestIDs.ts`. The migration lane runs them one checkpoint each; the upgrade scenarios compose
 * them through the v3 previous-build driver. Only the in-person path exists — v3 has no selectors for
 * send-video, address, email or non-BCSC capture.
 */

/** The PIN created on v3 and reused to unlock v4 after the swap. */
export const V3_PIN = '123456'
/** The persona the v3 walk is proven with (it selects the combined card type). */
export const V3_USER = TestUsers.combined

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

/** Wait for a v3 control to be displayed and enabled, then click it. */
async function clickWhenReady(
  element: ChainablePromiseElement,
  timeout: number = Timeouts.SCREEN_TRANSITION
): Promise<void> {
  await element.waitForDisplayed({ timeout })
  await element.waitForEnabled({ timeout })
  await element.click()
}

export async function tapAddCard(): Promise<void> {
  await clickWhenReady(await V3.Initial.addCard())
}

export async function completeTutorial(): Promise<void> {
  const numPages = 3
  for (let i = 0; i < numPages; i++) {
    try {
      await clickWhenReady(await V3.Tutorial.next(), 5_000)
    } catch {
      break
    }
  }
}

export async function advanceNewSetup(): Promise<void> {
  await clickWhenReady(await V3.NewSetup.continue())
}

export async function enableNotifications(): Promise<void> {
  await clickWhenReady(await V3.Notifications.continue())
  // Tapping Continue triggers the iOS system "Allow Notifications" popup.
  // On Sauce Labs RDC the popup hangs unless we explicitly accept it via WDA.
  await acceptSystemAlert()
}

/** Open a Setup Steps row (1 nickname, 2 card, 5 verify — 3 and 4 complete on their own for a card). */
export async function tapStep(step: 1 | 2 | 3 | 4 | 5): Promise<void> {
  await clickWhenReady(await V3.SetupSteps[`step${step}`]())
}

export async function acceptPrivacy(): Promise<void> {
  await clickWhenReady(await V3.Privacy.continue())
}

export async function acceptTerms(): Promise<void> {
  await clickWhenReady(await V3.Terms.acceptAndContinue())
}

export async function enterNickname(nickname: string): Promise<void> {
  if (driver.isAndroid) {
    const nicknameInput = await V3.Nickname.nicknameInput()
    await nicknameInput.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await nicknameInput.click()
    await nicknameInput.setValue(nickname)

    await clickWhenReady(await V3.Nickname.saveAndContinue(), 5_000)
  } else {
    const nicknameField = await $('-ios class chain:**/XCUIElementTypeTextField')
    await nicknameField.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await nicknameField.click()
    await nicknameField.setValue(nickname)

    const saveBtn = await $(
      '-ios class chain:**/XCUIElementTypeButton[`label CONTAINS "Save" OR label CONTAINS "Continue"`]'
    )
    await clickWhenReady(saveBtn, 5_000)
  }
}

export async function tapChoosePin(): Promise<void> {
  await clickWhenReady(await V3.PINPrep.choosePIN())
}

export async function createPin(pin: string): Promise<void> {
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

    await clickWhenReady(await V3.PINInput.understandCheckbox())

    const saveBtn = await V3.PINInput.saveAndContinue()
    await saveBtn.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
    await saveBtn.click()
  }
}

export async function selectCombinedCard(): Promise<void> {
  await clickWhenReady(await V3.CardTypeSelection.combinedCard())
}

export async function chooseEnterManually(): Promise<void> {
  await clickWhenReady(await V3.AddCardInstructions.enterManually())
}

export async function enterSerial(serial: string): Promise<void> {
  const serialInput = await V3.ManualEntry.serialInput()
  await serialInput.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await serialInput.waitForEnabled({ timeout: Timeouts.SCREEN_TRANSITION })
  await serialInput.click()
  await serialInput.setValue(serial)

  await clickWhenReady(await V3.ManualEntry.continue(), 5_000)
}

export async function enterBirthdate(dobDigits: string): Promise<void> {
  const dob = parseDob(dobDigits)

  if (driver.isAndroid) {
    // Android: tap the date field to open the spinner date picker dialog
    await clickWhenReady(await V3.Birthdate.birthdateInput())

    // The dialog opens asynchronously — `$$` answers [] until it renders, so wait for a picker first.
    await $('android.widget.NumberPicker').waitForDisplayed({ timeout: 5_000 })
    const pickers = await $$('android.widget.NumberPicker')
    const pickerCount = await pickers.length
    if (pickerCount < 3) {
      throw new Error(`Expected the day/month/year NumberPickers, found ${pickerCount}`)
    }

    // Detect locale order: if first picker has alphabetic text, it's month-first
    const firstText = await pickers[0].$('android.widget.EditText').getText()
    const isMonthFirst = /^[A-Za-z]/.test(firstText)
    const monthPicker = pickers[isMonthFirst ? 0 : 1]
    const dayPicker = pickers[isMonthFirst ? 1 : 0]
    const yearPicker = pickers[2]

    await scrollNumberPickerTo(dayPicker, dob.day)
    await scrollNumberPickerTo(monthPicker, dob.monthShort)
    await scrollNumberPickerTo(yearPicker, dob.year)

    await clickWhenReady(await V3.Birthdate.ok(), 5_000)
    await clickWhenReady(await V3.Birthdate.validate(), 5_000)
  } else {
    const monthWheel = await V3.Birthdate.monthWheel()
    await monthWheel.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await monthWheel.addValue(dob.monthFull)

    const dateWheel = await V3.Birthdate.dateWheel()
    await dateWheel.addValue(dob.day)

    const yearWheel = await V3.Birthdate.yearWheel()
    await yearWheel.addValue(dob.year)

    await clickWhenReady(await V3.Birthdate.validate(), 5_000)
  }
}

export async function selectInPerson(): Promise<void> {
  if (driver.isAndroid) {
    const inPersonOption = await $('android=new UiSelector().textContains("In Person")')
    await inPersonOption.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await inPersonOption.click()
  } else {
    await clickWhenReady(await V3.VerifyOptions.verifyInPerson())
  }
}

/** The XXXX-XXXX code off v3's in-person screen (iOS renders it without an id, so it is matched by shape). */
export async function readConfirmationCode(): Promise<string> {
  const codeEl = driver.isAndroid
    ? await V3.VerifyInPerson.confirmationCode()
    : await $('-ios predicate string:label MATCHES "^[A-Z0-9]{4}-[A-Z0-9]{4}$"')
  await codeEl.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  return codeEl.getText()
}

/** After the approval: Complete → the "You're all set" Ok → v3's Home. */
export async function completeApprovedVerification(): Promise<void> {
  await clickWhenReady(await V3.VerifyInPerson.complete())
  await clickWhenReady(await V3.AllSet.ok())

  const homeBtn = await V3.Home.whereToUse()
  await homeBtn.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
}

// ── Composites for the upgrade scenarios ──

/** Cold start → Step 1 done (privacy, terms, nickname, PIN) → back on v3's Setup Steps. */
export async function onboardOnV3(pin: string, nickname: string): Promise<void> {
  await tapAddCard()
  await completeTutorial()
  await advanceNewSetup()
  await enableNotifications()
  await tapStep(1)
  await acceptPrivacy()
  await acceptTerms()
  await enterNickname(nickname)
  await tapChoosePin()
  await createPin(pin)
}

/** Step 2 (combined card, typed serial, birthdate) → Step 5 → v3's verify options. */
export async function authorizeOnV3(user: { cardSerial: string; dob: string }): Promise<void> {
  await tapStep(2)
  await selectCombinedCard()
  await chooseEnterManually()
  await enterSerial(user.cardSerial)
  await enterBirthdate(user.dob)
  await tapStep(5)
}
