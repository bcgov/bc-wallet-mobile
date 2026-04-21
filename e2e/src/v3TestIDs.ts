/**
 * V3 BC Services Card app screen helper.
 *
 * The v3 app is a native app (Swift on iOS, Java/Android).
 * iOS uses accessibility identifiers (class-name based via BaseViewController pattern,
 * or explicit identifiers like `addCardButton`).
 * Android uses standard resource IDs (e.g. `ca.bc.gov.id.servicescard:id/add_card_btn`).
 *
 * Unlike the v4 React Native app which uses the same testID across platforms,
 * v3 requires platform-specific selectors. This module provides raw WDIO selectors
 * that can be used directly with `$()`.
 */

export const ANDROID_PKG = 'ca.bc.gov.id.servicescard.dev'

// ── Low-level selector shortcuts ──────────────────────────────────────
const androidId = (id: string) => $(`android=new UiSelector().resourceId("${ANDROID_PKG}:id/${id}")`)
const androidText = (text: string) => $(`android=new UiSelector().text("${text}")`)
const androidDesc = (desc: string) => $(`android=new UiSelector().description("${desc}")`)
const iosId = (id: string) => $(`~${id}`)
const iosPredicate = (pred: string) => $(`-ios predicate string:${pred}`)
const iosClassChain = (chain: string) => $(`-ios class chain:${chain}`)

// ── Composite helpers ─────────────────────────────────────────────────

/**
 * Build a cross-platform WDIO selector for a v3 element.
 * @param iosAccessibilityId - iOS accessibility identifier
 * @param androidResourceId - Android resource ID (without package prefix)
 */
function v3sel(iosAccessibilityId: string, androidResourceId: string) {
  return async () => (driver.isIOS ? iosId(iosAccessibilityId) : androidId(androidResourceId))
}

/**
 * Build a selector by text content (fallback for elements without stable IDs).
 */
function v3text(text: string) {
  return async () => (driver.isIOS ? iosPredicate(`label == "${text}" OR value == "${text}"`) : androidText(text))
}

/**
 * Build a cross-platform selector by accessibility label/content-description.
 */
function v3accessibility(iosLabel: string, androidDescription: string) {
  return async () => (driver.isIOS ? iosId(iosLabel) : androidDesc(androidDescription))
}

/**
 * Build an iOS picker-wheel selector by position (1-indexed).
 * Returns a no-op on Android (date picker is handled differently there).
 */
function v3iosPickerWheel(index: number) {
  return async () =>
    driver.isIOS ? $(`(//XCUIElementTypePickerWheel)[${index}]`) : $(`(//android.widget.EditText)[${index}]`)
}

export const V3 = {
  Initial: {
    /** The "Set up" / "Add Card" button on the first screen after onboarding. */
    addCard: v3sel('addCardButton', 'add_card_btn'),
    selfSetup: v3sel('selfSetupButton', 'self_setup_btn'),
  },

  Tutorial: {
    view: v3sel('tutorialView', 'view_pager'),
    /** Android: resource ID `btn_next`. iOS: button titled "Continue" (no accessibility ID). */
    next: v3sel('Continue', 'btn_next'),
  },

  /** The "New setup" intro page shown after tapping Add Card. */
  NewSetup: {
    /** Android: `continue_btn` / iOS: button titled "Continue". */
    continue: v3sel('Continue', 'continue_btn'),
  },

  /** The "Setup Steps" hub page that lists Step 1 through Step 5. */
  SetupSteps: {
    step1: v3text('Step 1'),
    step2: v3text('Step 2'),
    step3: v3text('Step 3'),
    step4: v3text('Step 4'),
    step5: v3text('Step 5'),
  },

  Notifications: {
    continue: v3text('Continue'),
  },

  Privacy: {
    continue: v3text('Continue'),
  },

  Terms: {
    accept: v3text('Accept'),
    acceptAndContinue: v3text('Accept & Continue'),
  },

  Nickname: {
    /** Android: accessibility "Account nickname". iOS: generic text field. */
    nicknameInput: v3accessibility('Account nickname', 'Account nickname'),
    saveAndContinue: v3sel('SaveAndContinueButton', 'save_nickname_continue_btn'),
  },

  PINPrep: {
    /**
     * iOS: Both options are GovernmentBlueView with the same accessibilityIdentifier.
     * accessibilityLabel is set on the child titleLabel, not the parent view,
     * so predicate string matching on label doesn't work reliably.
     * Use index instead — Choose a PIN is the second GovernmentBlueView.
     */
    choosePIN: async () => {
      if (driver.isIOS) {
        const views = await $$('~GovernmentBlueView')
        return views[1]
      }
      return androidId('use_pin_security_ll')
    },
    useDeviceSecurity: async () => {
      if (driver.isIOS) {
        const views = await $$('~GovernmentBlueView')
        return views[0]
      }
      return androidId('use_device_security_ll')
    },
  },

  PINInput: {
    choosePIN: async () =>
      driver.isIOS ? iosClassChain('**/XCUIElementTypeSecureTextField[1]') : androidId('choose_pin_et'),
    confirmPIN: async () =>
      driver.isIOS ? iosClassChain('**/XCUIElementTypeSecureTextField[2]') : androidId('confirm_pin_et'),
    understandCheckbox: async () =>
      driver.isIOS
        ? iosPredicate('label CONTAINS "I understand if I forget my PIN"')
        : androidId('understand_forget_pin_checkbox'),
    saveAndContinue: async () =>
      driver.isIOS
        ? iosPredicate('type == "XCUIElementTypeButton" AND label == "Save PIN and Continue"')
        : androidText('Save PIN and Continue'),
  },

  PINUnlock: {
    pinEntry: v3sel('PINVerifyViewController', 'enter_pin_et'),
    continue: v3sel('PINVerifyViewController', 'unlock_pin_continue_btn'),
  },

  CardTypeSelection: {
    combinedCard: async () =>
      driver.isIOS
        ? iosPredicate('label CONTAINS "combined with my driver"')
        : androidText("It's combined with my driver's licence"),
    photoCard: v3sel('HaveCardButton', 'btn_have_bcsc_photo'),
    nonPhotoCard: v3sel('HaveCardButton', 'btn_have_bcsc_nonphoto'),
  },

  AddCardInstructions: {
    enterManually: v3sel('EnterManually', 'enter_manually'),
    useCamera: v3sel('AddCardInstructionController', 'use_camera'),
  },

  ManualEntry: {
    serialInput: async () => (driver.isIOS ? iosId('SerialNumberTextfield') : androidDesc('Serial Number')),
    continue: async () => (driver.isIOS ? iosId('ContinueButton') : androidText('Continue')),
  },

  Birthdate: {
    birthdateInput: v3sel('BirthdateTextField', 'birth_date_text_view'),
    testingBirthdayInput: v3sel('BirthdateTextField', 'testing_birthday_et'),
    monthWheel: v3iosPickerWheel(1),
    dateWheel: v3iosPickerWheel(2),
    yearWheel: v3iosPickerWheel(3),
    ok: v3text('OK'),
    continue: v3sel('ContinueButton', 'btn_continue'),
    validate: async () => (driver.isIOS ? iosId('DoneButton') : androidId('validate_button')),
  },

  VerifyOptions: {
    verifyInPerson: v3sel('VerifyByCounterCell', 'verifyOptionsRecyclerView'),
  },

  VerifyInPerson: {
    confirmationCode: v3sel('PINVerifyViewController', 'user_code'),
    complete: v3text('Complete'),
  },

  AllSet: {
    ok: async () =>
      driver.isIOS ? iosPredicate('type == "XCUIElementTypeButton" AND label == "Ok"') : androidId('btn_ok'),
  },

  Home: {
    whereToUse: v3text('Where to use'),
  },
} as const
