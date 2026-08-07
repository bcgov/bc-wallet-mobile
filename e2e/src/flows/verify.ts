import type { TestUser } from '../constants.js'
import { COMBO_CARD_BARCODE_MASKS, Timeouts } from '../constants.js'
import { tapAlertButton } from '../helpers/alerts.js'
import { ApproveInPersonInput, approveInPersonRequest } from '../helpers/approval.js'
import type { ImageMaskRegion } from '../helpers/camera.js'
import { injectPhoto } from '../helpers/camera.js'
import { getEmailConfirmationCode, getLatestMailId, getTempEmailAddress } from '../helpers/email.js'
import { swipeUpBy } from '../helpers/gestures.js'
import {
  closeHelpMenu,
  HelpMenuRows,
  openHelpMenu,
  RestartVerificationAlert,
  tapHelpMenuRow,
} from '../helpers/help-menu.js'
import { isSauceLabs } from '../helpers/sauce.js'
import { describeCurrentScreen, reachCameraScreen } from '../helpers/screens.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { HomeNotificationCard, HomeScreen } from '../screens/main.js'
import { VerifyPromptScreen } from '../screens/onboarding.js'
import {
  AccountSetupScreen,
  AdditionalIdentificationRequiredScreen,
  DualIdentificationRequiredScreen,
  EmailConfirmationScreen,
  EmailVerifiedScreen,
  EnterBirthdateScreen,
  EnterEmailScreen,
  EvidenceCaptureScreen,
  EvidenceIDCollectionScreen,
  IdentitySelectionScreen,
  IDPhotoInformationScreen,
  ManualSerialScreen,
  PhotoReviewScreen,
  ResidentialAddressScreen,
  ScanSerialScreen,
  VerificationMethodSelectionScreen,
  VerificationSuccessScreen,
  VerifyInPersonScreen,
} from '../screens/verify.js'

/**
 * Verify-stack arranges: the entry spine plus the per-step arranges that mirror the app's
 * `getResumeStepRoute` (id → address → email → verify), composed with `reachVerificationMethod()`.
 *
 * VerifyPrompt exists only in the session that completed onboarding — run `completeOnboarding()` first
 * and never relaunch in between.
 */

const engine = new BaseScreen()

/** Confirming action on EnterEmail's skip alert — copy-matched, as its buttons carry no testIDs. */
const EMAIL_SKIP_CONFIRM = 'Skip'

/** VerifyPrompt `Continue` → the AccountSetup add-or-transfer choice. */
export async function startVerification(): Promise<void> {
  await VerifyPromptScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerifyPromptScreen.tap('primary')
  await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** AccountSetup `AddAccount` → IdentitySelection. */
export async function chooseAddAccount(): Promise<void> {
  await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await AccountSetupScreen.tap('primary')
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Help menu → "Back to home", KEEPING progress (the app only moves the status out of IN_PROGRESS).
 * Available on every verify screen except VerifyPrompt and the two transfer screens.
 */
export async function leaveVerificationToHome(): Promise<void> {
  await openHelpMenu()
  await tapHelpMenuRow(HelpMenuRows.backToHome)
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Re-enter an interrupted verification from Home's verification card — the only route back in, since
 * the in-progress flag is in-memory. The stack mounts at `getResumeStepRoute`; which screen that is,
 * is the caller's assertion.
 */
export async function resumeVerification(): Promise<void> {
  await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeNotificationCard.tapToNavigate('primary')
}

/**
 * Help menu → "Restart verification process", answering its confirmation alert.
 *
 * `confirm` wipes progress and re-registers the device with IAS, reopening on AccountSetup — NOT
 * IdentitySelection. `cancel` leaves the menu open, so it is closed here.
 */
export async function restartVerification(answer: 'confirm' | 'cancel'): Promise<void> {
  await openHelpMenu()
  await tapHelpMenuRow(HelpMenuRows.restartVerification)
  if (answer === 'cancel') {
    await tapAlertButton(RestartVerificationAlert.cancel)
    await closeHelpMenu()
    return
  }
  await tapAlertButton(RestartVerificationAlert.confirm)
}

/**
 * The CI-default serial path, no live camera: `Scan` → ScanSerial (accepting the OS camera dialog if it
 * appears) → `EnterManually` → serial typed → EnterBirthdate. Card type is derived later, by
 * `authorizeDevice` at the birthdate submit.
 */
export async function enterSerialManually(user: TestUser): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('primary')
  await reachCameraScreen('ScanSerial', () => ScanSerialScreen.isPresent(1_000))
  await ScanSerialScreen.tapToNavigate('primary')
  await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ManualSerialScreen.fill('serial', user.cardSerial, { tapFirst: true })
  await engine.dismissKeyboard()
  await ManualSerialScreen.tapWhenEnabled('primary')
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Fill and SUBMIT the birthdate — the submit fires `authorizeDevice(serial, dob)`, which derives the
 * card type. Callers assert the post-authorize screen themselves (it differs per card type); for a
 * no-network fill, use `EnterBirthdateScreen.fill(...)` directly.
 */
export async function enterBirthdate(user: TestUser): Promise<void> {
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterBirthdateScreen.fill('birthdate', user.dob, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterBirthdateScreen.tapWhenEnabled('primary')
}

/** The SiteMinder approval payload for a user's flow: serial + birthdate, typed document numbers, or both. */
function approvalInputForUser(user: TestUser): ApproveInPersonInput {
  if (user.flow === 'non-bcsc') {
    return {
      flow: 'non-bcsc',
      documents: [
        { typeId: user.primaryDocumentTypeId, number: user.primaryDocumentNumber },
        { typeId: user.documentTypeId, number: user.documentNumber },
      ],
    }
  }
  if (user.flow === 'non-photo') {
    return {
      flow: 'non-photo',
      cardSerialNumber: user.cardSerial,
      cardBirthdate: user.dob,
      document: { typeId: user.documentTypeId, number: user.documentNumber },
    }
  }
  return { flow: 'photo', cardSerialNumber: user.cardSerial, cardBirthdate: user.dob }
}

/**
 * From the post-authorize state, reach VerificationMethodSelection. The address step is auto-satisfied
 * once the device is authorized; the email step only appears when the card supplied no verified email —
 * detect it by its SkipEmail button and skip it (BCSC cards allow skipping).
 */
export async function reachVerificationMethod(): Promise<void> {
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await VerificationMethodSelectionScreen.isPresent(1_000)) {
      return
    }
    if (await EnterEmailScreen.isVisible('skip')) {
      await EnterEmailScreen.tap('secondary') // SkipEmail (BCSC flow) → confirmation alert
      // Confirm-gated: the tap only raises the alert, which blocks the screen until answered. Unexercised
      // today, as every SIT BCSC card carries a verified email.
      await tapAlertButton(EMAIL_SKIP_CONFIRM)
      await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      return
    }
    if (Date.now() > deadline) {
      throw new Error(
        `reachVerificationMethod: neither VerificationMethodSelection nor EnterEmail appeared. On screen: ${await describeCurrentScreen()}`
      )
    }
    // VerificationMethodSelection anchors on the Hours-of-Service heading, which can sit below the fold
    // where isPresent() (which never scrolls) reads an arrival as a miss. Nudge it into view.
    await swipeUpBy()
  }
}

/**
 * Complete verification via the IN-PERSON method — the only CI-completable one (send-video and
 * live-call open camera screens). From VerificationMethodSelection: read the confirmation code, drive
 * the real SiteMinder SIT approval (needs `SM_USER`/`SM_PASSWORD` and an allowlisted runner IP), then
 * Complete → VerificationSuccess → Home.
 */
export async function completeVerification(user: TestUser): Promise<void> {
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationMethodSelectionScreen.link('inPerson')

  await VerifyInPersonScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const confirmationCode = await VerifyInPersonScreen.read('confirmationCode')
  await approveInPersonRequest(confirmationCode, approvalInputForUser(user))

  await VerifyInPersonScreen.tapWhenEnabled('primary') // Complete
  await VerificationSuccessScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await VerificationSuccessScreen.tap('primary') // Continue → exits verify stack to Home

  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Start the email step against a throwaway inbox, continuing to EmailConfirmation. Returns the inbox
 * token the code is later read with.
 *
 * Non-BCSC only: the step is mandatory there (Skip is hidden), while BCSC cards carry a verified email
 * and never see it — those use `reachVerificationMethod` instead.
 */
export async function startEmailVerification(): Promise<string> {
  const { email, token } = await getTempEmailAddress()

  await EnterEmailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterEmailScreen.fill('email', email, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterEmailScreen.tapWhenEnabled('primary') // Continue → createEmailVerification → EmailConfirmation

  await EmailConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  return token
}

/**
 * Type a code into EmailConfirmation and Continue. Asserts NOTHING about what follows — a correct code
 * resets the stack to EmailVerified, a wrong one stays put with an inline error — so the caller decides.
 */
export async function submitEmailCode(code: string): Promise<void> {
  await EmailConfirmationScreen.fill('code', code, { tapFirst: true })
  await engine.dismissKeyboard()
  await EmailConfirmationScreen.tapWhenEnabled('primary') // Continue → sendCode
}

/**
 * Tap "Send a new code" and return the code from the message that arrives AFTER it.
 *
 * The new message IS the assertion: the resend's only other feedback is a 1.5s toast, and it mints a
 * fresh `email_address_id`, retiring the code already in the inbox.
 */
export async function resendEmailCode(token: string): Promise<string> {
  // Wait for the first code before resending — a baseline taken from a still-empty inbox would let the
  // wait below return that first, now-retired message.
  const alreadyReceived = await getLatestMailId(token)
  await tapResendCodeLink()
  return getEmailConfirmationCode(token, { afterMailId: alreadyReceived })
}

/**
 * Tap "Send a new code". Its testID sits on a `ThemedText` nested inside another, which RN flattens into
 * the parent paragraph — so the accessibility label is tried too, and the failure names that cause
 * rather than reporting a missing element.
 */
async function tapResendCodeLink(): Promise<void> {
  if (await EmailConfirmationScreen.isVisible('resendCode')) {
    await EmailConfirmationScreen.link('resendCode')
    return
  }

  const label = 'Send a new code' // BCSC.EmailConfirmation.SendNewCode
  const selector = driver.isIOS
    ? `-ios predicate string:label == "${label}" OR name == "${label}"`
    : `android=new UiSelector().description("${label}")`
  const link = $(selector)
  if (await link.isDisplayed().catch(() => false)) {
    await link.click()
    return
  }

  throw new Error(
    'EmailConfirmation\'s "Send a new code" link is not addressable by testID or accessibility label: ' +
      'it is a Text nested inside another Text, which RN flattens into the paragraph. Covering the resend ' +
      'branch would need the link moved onto a real pressable in the app.'
  )
}

/**
 * EmailVerified → VerificationMethodSelection. EmailVerified's only testID is the shared Continue, so
 * arrival is confirmed by its title copy.
 */
export async function completeEmailVerification(): Promise<void> {
  const verifiedTitle = await engine.findByText('Your email has been verified')
  await verifiedTitle.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await EmailVerifiedScreen.tap('primary') // RESETS to VerificationMethodSelection

  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** Every EvidenceTypeList row with its testID — discovered, not declared: the ids embed the server's `evidence_type`. */
async function evidenceTypeRows(): Promise<{ id: string; element: WebdriverIO.Element }[]> {
  const rowsSelector = driver.isIOS
    ? '-ios predicate string:name CONTAINS "EvidenceTypeListItem"'
    : 'android=new UiSelector().resourceIdMatches(".*EvidenceTypeListItem.*")'
  await $(rowsSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })

  const attr = driver.isIOS ? 'name' : 'resource-id'
  const rows = await $$(rowsSelector)
  const found: { id: string; element: WebdriverIO.Element }[] = []
  for (const element of rows) {
    found.push({ id: (await element.getAttribute(attr).catch(() => null)) ?? '', element })
  }
  return found
}

/**
 * The testIDs the list is currently offering — for asserting what it does NOT offer. Match as
 * substrings, and print the whole list on failure: it is the only record of what the backend served.
 */
export async function listEvidenceTypeRowIds(): Promise<string[]> {
  return (await evidenceTypeRows()).map((row) => row.id)
}

/**
 * Tap the one EvidenceTypeList row whose testID contains `match` (case-insensitive; the
 * `EvidenceTypeListItem-<evidence_type>` suffix is server-provided, so never guess an exact label).
 * Zero or multiple matches throw with the row ids found, making a mismatch self-diagnosing.
 *
 * Selecting PERSISTS the choice and pushes IDPhotoInformation — stopping here leaves an evidence entry
 * with no photos, the app's "capture interrupted" state.
 */
export async function selectEvidenceType(match: string): Promise<void> {
  const rows = await evidenceTypeRows()
  const needle = match.toLowerCase()
  const ids = rows.map((row) => row.id)
  let target: WebdriverIO.Element | null = null
  let count = 0
  for (const row of rows) {
    if (row.id.toLowerCase().includes(needle)) {
      count += 1
      target = row.element
    }
  }

  if (count === 1 && target) {
    // The list arrives on a push animation — settle the row first, or the tap lands on stale bounds,
    // is silently dropped, and the flow blames the NEXT screen.
    await engine.waitForSteadyPosition(target)
    await target.click()
    return
  }
  throw new Error(
    count === 0
      ? `EvidenceTypeList: no row testID contains "${match}". Rows found: ${JSON.stringify(ids)}`
      : `EvidenceTypeList: "${match}" matched ${count} rows (ambiguous). Rows: ${JSON.stringify(ids)}`
  )
}

/**
 * Wait for EvidenceCapture's shutter, naming which of two causes a timeout was. The shutter renders only
 * once `useCameraDevice` resolves, so a miss means either the push never landed (container absent) or no
 * camera came up (container present) — indistinguishable from the timeout alone.
 */
async function reachEvidenceCamera(): Promise<void> {
  try {
    await reachCameraScreen('EvidenceCapture', () => EvidenceCaptureScreen.isPresent(1_000))
  } catch (err) {
    const containerMounted = await EvidenceCaptureScreen.isVisible('maskedCamera')
    throw new Error(
      `${(err as Error).message}\nMaskedCamera container ${containerMounted ? 'IS' : 'is NOT'} mounted — ` +
        (containerMounted
          ? 'the screen was reached but no camera device resolved.'
          : 'EvidenceCapture is not on screen: the push never landed, or the app navigated AWAY mid-capture. ' +
            'If the on-screen dump above shows IDPhotoInformation right after a UsePhoto, a barcode decoded ' +
            'off the injected image made the app reroute into card setup — mask the barcode regions ' +
            '(see COMBO_CARD_BARCODE_MASKS) instead of re-tapping through; the flow state is corrupted at that point.')
    )
  }
}

/**
 * Capture a document's photo(s), repeating per side (1 for a passport, 2 for a licence — backend-driven)
 * until the typed EvidenceIDCollection form appears. CAMERA-ONLY: on Sauce the image is injected before
 * the shutter; on a local device the physical camera captures whatever it sees.
 *
 * `barcodeMasks` MUST cover any decodable barcode on the image: the camera runs a live code scanner
 * behind the shutter that Android's injected frames feed. An unmasked SIT combo barcode gets scanned,
 * and in the non-BCSC flow the app then authorizes THAT card and resets into card setup mid-capture.
 *
 * `retakeFirstSide` exercises PhotoReview's Retake — it re-shoots the same side, so only the
 * discard-and-return path differs.
 */
async function capturePhotoIdDocument(
  image: string,
  barcodeMasks: readonly ImageMaskRegion[] = [],
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // Confirm the push landed: a tap dispatched mid-transition is swallowed on Android yet still reports
  // success, and the flow then waits out its timeout on a camera screen that never opened.
  await IDPhotoInformationScreen.tapToNavigate('primary')

  for (let side = 0; side < 2; side++) {
    await shootDocumentSide(image, barcodeMasks)
    if (side === 0 && options.retakeFirstSide) {
      await PhotoReviewScreen.tapToNavigate('secondary') // Retake → back to the camera, same side
      await shootDocumentSide(image, barcodeMasks)
    }
    await PhotoReviewScreen.tapToNavigate('primary') // UsePhoto → next side or the typed form
    if (await EvidenceIDCollectionScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      return
    }
  }
  await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/** One trip through the document camera: reach it, inject, fire the shutter, land on PhotoReview. */
async function shootDocumentSide(image: string, barcodeMasks: readonly ImageMaskRegion[]): Promise<void> {
  // Camera permission is requested on first entry — accepted whenever it appears, or EvidenceCapture
  // renders the PermissionDisabled fallback. Later entries still restart the capture session, so every
  // entry gets the camera budget rather than a screen-transition one.
  await reachEvidenceCamera()
  if (isSauceLabs()) {
    await injectPhoto(image, {}, barcodeMasks) // padding may need tuning to the document mask
  }
  await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter — NOT tapToNavigate (not idempotent)
  await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Non-photo BCSC "additional ID", step one: open the photo-ID list from AdditionalIdentificationRequired.
 * Separate from the capture, and re-callable, because backing out of the list's non-photo escape hatch
 * lands here again.
 */
export async function reachAdditionalPhotoIdList(): Promise<void> {
  // This screen's only testID is the generic `Continue` (shared by ~10 screens), so wait for its unique
  // heading — otherwise a lingering `Continue` from the previous screen gets tapped mid-transition.
  const headingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "provide additional ID"'
    : 'android=new UiSelector().textContains("provide additional ID")'
  await $(headingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await AdditionalIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList
}

/**
 * Non-photo BCSC "additional ID", step two: pick the ID type and capture it, stopping ON the typed
 * EvidenceIDCollection form — the number is submitted separately by {@link submitEvidenceIdCollection},
 * and that gap is itself a resumable state. `evidenceMatch` is a case-insensitive substring of the
 * target row's testID (e.g. `'Passport'`). Camera-only via {@link capturePhotoIdDocument}.
 */
export async function captureAdditionalPhotoId(
  user: TestUser,
  evidenceMatch: string,
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await selectEvidenceType(evidenceMatch)
  // The card-back template carries the SIT combo barcode; the scanner runs behind every capture, so mask
  // it even though the reroute has only been observed in the non-BCSC flow.
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS, options)
}

/**
 * Fill an EvidenceIDCollection form — document number, plus (first non-BCSC ID only) name + birthdate —
 * then Continue. Every field is re-typed from scratch, so this is re-callable after a rejected submit.
 */
export async function submitEvidenceIdCollection(
  documentNumber: string,
  personalInfo?: { lastName: string; firstName: string; dob: string }
): Promise<void> {
  await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EvidenceIDCollectionScreen.fill('documentNumber', documentNumber, { tapFirst: true })
  if (personalInfo) {
    await EvidenceIDCollectionScreen.fill('lastName', personalInfo.lastName, { tapFirst: true })
    await EvidenceIDCollectionScreen.fill('firstName', personalInfo.firstName, { tapFirst: true })
    await EvidenceIDCollectionScreen.fill('birthdate', personalInfo.dob, { tapFirst: true })
  }
  await engine.dismissKeyboard()
  await EvidenceIDCollectionScreen.tapWhenEnabled('primary') // EvidenceIDCollectionContinue
}

/**
 * Enter the non-BCSC branch: `OtherID` → DualIdentificationRequired → the first-ID EvidenceTypeList.
 * OtherID discards any serial already entered, so this is a one-way turn off the BCSC path.
 *
 * Stops AT the list, committing no document — the cheap way to reach the evidence screens.
 */
export async function chooseOtherIdPath(): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('secondary') // OtherID → DualIdentificationRequired

  // DualIdentificationRequired's only CTA is the generic `Continue`; confirm by heading before tapping.
  const dualHeadingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "two government"'
    : 'android=new UiSelector().textContains("two government")'
  await $(dualHeadingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  // Confirm-and-retry is safe on the generic `Continue` here: EvidenceTypeList renders no Continue of
  // its own, so the button going away means the push landed.
  await DualIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList (first ID)
}

/**
 * Non-BCSC first ID: OtherID → list → pick → capture, stopping ON the typed form (which also collects
 * name + birthdate). `docMatch` is a case-insensitive substring of the target row's testID.
 *
 * The card-back image carries the SIT combo barcode, and this is the flow that reroutes on a scan — so
 * those regions are masked out of the injection.
 */
export async function captureFirstNonBcscDocument(user: TestUser, docMatch: string): Promise<void> {
  if (user.flow !== 'non-bcsc') {
    throw new Error(`captureFirstNonBcscDocument requires a non-bcsc TestUser (got '${user.flow}')`)
  }
  await chooseOtherIdPath()
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS)
}

/**
 * Non-BCSC second ID: pick → capture, stopping ON its typed form. Submitting that form (number only)
 * resumes to ResidentialAddress. The list differs from the first document's — the screen filters by
 * `collection_order` and hides what was already chosen.
 */
export async function captureSecondNonBcscDocument(user: TestUser, docMatch: string): Promise<void> {
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.selfieImage)
}

/**
 * Fill the ResidentialAddress form (non-BCSC only) → the mandatory email step. Province is a dropdown:
 * tap to open the modal, then pick British Columbia.
 *
 * Nothing here may dismiss the keyboard positionally — the province dropdown sits under the old blind
 * tap point, which is why {@link BaseScreen.dismissKeyboard} no longer uses one on iOS.
 */
export async function fillResidentialAddress(): Promise<void> {
  await ResidentialAddressScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.fill('streetAddress1', '123 Main St', { tapFirst: true })
  await ResidentialAddressScreen.fill('city', 'Victoria', { tapFirst: true })
  await engine.dismissKeyboard()

  await ResidentialAddressScreen.link('province')
  await ResidentialAddressScreen.waitFor('provinceBC', Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.link('provinceBC')
  await expectProvinceDropdownClosed()

  await ResidentialAddressScreen.fill('postalCode', 'V8W 2Y2', { tapFirst: true })
  await engine.dismissKeyboard()
  await ResidentialAddressScreen.tapWhenEnabled('primary') // ResidentialAddressContinue
}

/**
 * Wait for the province modal to close — the BC option only exists inside it. Asserted explicitly so a
 * swallowed option tap is named here, not later as an unreachable postal-code field.
 */
async function expectProvinceDropdownClosed(): Promise<void> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  do {
    if (!(await ResidentialAddressScreen.isVisible('provinceBC'))) return
    await driver.pause(250)
  } while (Date.now() < deadline)
  throw new Error('The province dropdown did not close after selecting British Columbia')
}
