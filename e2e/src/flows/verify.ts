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
 * Verify-stack arranges: the entry spine plus the post-authorize step arranges that mirror the app's
 * `getResumeStepRoute` (id → address → email → verify). Reaching a given step is composed from
 * `reachVerificationMethod()` + the explicit per-step arranges (`collectNonBcscEvidence`,
 * `fillResidentialAddress`, `verifyEmailWithTempInbox`, `addAdditionalPhotoId`) rather than a single
 * parameterized `reachVerifyStep`. `completeVerification(user)` then drives the
 * in-person approval to VerificationSuccess.
 *
 * Reminder: the VerifyPrompt exists only in the session that completed onboarding — run
 * `completeOnboarding()` first and never relaunch in between.
 */

const engine = new BaseScreen()

/**
 * The confirming action on EnterEmail's skip alert (`BCSC.EnterEmail.EmailSkipButton2`) — copy-matched,
 * as the alert's buttons carry no testIDs. Its sibling action keeps the user on the form.
 */
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
 * Leave an in-progress verification for Home via the header help menu's "Back to home", KEEPING
 * progress (`useLeaveVerification` only moves the verification status out of IN_PROGRESS, which makes
 * RootStack render the MainStack; nothing is cleared).
 *
 * Available on every verify screen except the initial VerifyPrompt and the two transfer screens, which
 * override `headerRight` with the default help menu.
 */
export async function leaveVerificationToHome(): Promise<void> {
  await openHelpMenu()
  await tapHelpMenuRow(HelpMenuRows.backToHome)
  await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Re-enter an interrupted verification from Home by tapping the Start/Continue-verification card —
 * the app's ONLY route back in, since the in-progress flag is in-memory and every relaunch recomputes
 * it as unverified. The VerifyStack then mounts at `getResumeStepRoute`; WHICH screen that is, is the
 * caller's assertion (that mapping is the thing under test).
 */
export async function resumeVerification(): Promise<void> {
  await HomeNotificationCard.expectVisible(Timeouts.SCREEN_TRANSITION)
  await HomeNotificationCard.tapToNavigate('primary')
}

/**
 * Open the help menu's "Restart verification process" and answer its confirmation alert.
 *
 * `confirm` wipes all verification progress and re-registers the device with IAS (a backend round trip
 * behind a loading screen), then clears the recorded setup type — so the flow reopens on AccountSetup,
 * NOT IdentitySelection. `cancel` leaves the menu open, so it is closed here to return the caller to
 * the screen they started on.
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
 * The CI-default serial path — no live camera: IdentitySelection `Scan` → ScanSerial (accepting the
 * OS camera dialog whenever it appears; no-op when permission is already granted) → `EnterManually` →
 * ManualSerial → serial typed → EnterBirthdate. Card type is derived later, by `authorizeDevice`
 * at the birthdate submit.
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
 * Fill and SUBMIT the birthdate — the submit fires the backend `authorizeDevice(serial, dob)` that
 * derives the card type and resumes the flow. Callers assert the post-authorize screen themselves
 * (it differs per card type). For a no-network fill (e.g. the entry-spine journey), use
 * `EnterBirthdateScreen.fill(...)` directly instead.
 */
export async function enterBirthdate(user: TestUser): Promise<void> {
  await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterBirthdateScreen.fill('birthdate', user.dob, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterBirthdateScreen.tapWhenEnabled('primary')
}

/**
 * Build the SiteMinder in-person approval payload from a TestUser's flow — card-tap flows pass the
 * serial + birthdate, document flows pass the typed document number(s). Mirrors the per-flow inputs
 * `approveInPersonRequest` expects.
 */
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
 * From the post-authorize state (birthdate submitted), reach VerificationMethodSelection. For a
 * card-tap flow the address step is auto-satisfied once the device is authorized; the email step only
 * appears when the card supplied no verified email — detect it by its SkipEmail button (a stable
 * testID via the EnterEmail descriptor; the input marker is less reliable) and skip it (BCSC cards
 * allow skipping). On an unexpected screen the error reports what is actually on screen.
 */
export async function reachVerificationMethod(): Promise<void> {
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await VerificationMethodSelectionScreen.isPresent(1_000)) {
      return
    }
    if (await EnterEmailScreen.isVisible('skip')) {
      await EnterEmailScreen.tap('secondary') // SkipEmail (BCSC flow) → confirmation alert
      // Skipping is confirm-gated: the tap only raises an `Alert.alert`, and the skip is recorded by
      // its second action. Unanswered, that alert blocks the screen — so this branch cannot be a bare
      // tap. It is currently unexercised (every SIT BCSC card carries a verified email, so the email
      // step never renders), which is exactly why the alert had gone unnoticed.
      await tapAlertButton(EMAIL_SKIP_CONFIRM)
      await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      return
    }
    if (Date.now() > deadline) {
      throw new Error(
        `reachVerificationMethod: neither VerificationMethodSelection nor EnterEmail appeared. On screen: ${await describeCurrentScreen()}`
      )
    }
    // VerificationMethodSelection anchors on the Hours-of-Service heading, which sits at the BOTTOM of
    // the screen and can be below the fold on a short viewport — where isPresent() (which never scrolls)
    // reads a genuine arrival as a miss. Nudge the content up to reveal the anchor before the next
    // probe. Safe on the email screen (its Skip button is caught above, before we ever swipe) and a
    // no-op while the post-authorize transition is still settling.
    await swipeUpBy()
  }
}

/**
 * Complete verification via the IN-PERSON method — the CI default: no in-app camera, approved by the
 * real SiteMinder/IDcheck SIT flow (`approveInPersonRequest`; needs `SM_USER`/`SM_PASSWORD` and an
 * allowlisted runner IP). Assumes VerificationMethodSelection is showing. Reads the on-screen
 * confirmation code, drives the approval, then Complete → VerificationSuccess → Home (verified).
 *
 * In-person is the only CI-completable method (hence no `method` parameter); the send-video /
 * live-call methods enter camera screens and are exercised in the manual suite.
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
 * Start the email step against a throwaway inbox: enter a temp address and continue to
 * EmailConfirmation. Returns the inbox token the code is later read with.
 *
 * The email step is MANDATORY in the non-BCSC flow (Skip is hidden there and a non-BCSC user has no
 * card-provided email), so this belongs to the non-bcsc journey. BCSC photo/combined cards carry a
 * verified email and never see the step — those use `reachVerificationMethod` instead.
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
 * Type a code into EmailConfirmation and press Continue. Deliberately asserts NOTHING about what
 * follows: a correct code resets the stack to EmailVerified, while a wrong one keeps the screen and
 * adds an inline error (plus, for a rejected-by-the-server code, an alert). The caller decides which
 * it expected.
 */
export async function submitEmailCode(code: string): Promise<void> {
  await EmailConfirmationScreen.fill('code', code, { tapFirst: true })
  await engine.dismissKeyboard()
  await EmailConfirmationScreen.tapWhenEnabled('primary') // Continue → sendCode
}

/**
 * Tap "Send a new code" and return the code from the message that arrives AFTER it.
 *
 * Waiting for a NEW message is the assertion — the resend's only other feedback is a toast that
 * auto-hides in 1.5s, which a polling client cannot observe reliably. It also has to be a new message:
 * the resend mints a fresh `email_address_id`, so the code already in the inbox is dead from that
 * moment and submitting it would fail as a mismatch.
 */
export async function resendEmailCode(token: string): Promise<string> {
  // Waits for the FIRST code to land before resending: taking the baseline from a still-empty inbox
  // would let the wait below return that first message, whose code the resend has just retired.
  const alreadyReceived = await getLatestMailId(token)
  await tapResendCodeLink()
  return getEmailConfirmationCode(token, { afterMailId: alreadyReceived })
}

/**
 * Tap "Send a new code". Its testID sits on a `ThemedText` nested INSIDE another `ThemedText`, and RN
 * flattens nested text into the parent paragraph — the same shape that turned out to be unaddressable
 * for the Contacts inline link. It may still surface as its own element here, because this one also
 * carries `accessibilityRole="link"` and a label, so both handles are tried before giving up; the
 * failure names the cause rather than reporting a missing element.
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
 * Finish the email step after a code was accepted: EmailVerified → VerificationMethodSelection.
 * EmailVerified's only testID is the shared Continue, so arrival is confirmed by its title copy.
 */
export async function completeEmailVerification(): Promise<void> {
  const verifiedTitle = await engine.findByText('Your email has been verified')
  await verifiedTitle.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await EmailVerifiedScreen.tap('primary') // RESETS to VerificationMethodSelection

  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Every EvidenceTypeList row on screen, paired with its testID. The list has no container testID and
 * its rows are keyed by the SERVER's `evidence_type`, so the ids are discovered rather than declared.
 */
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
 * The testIDs of the rows the list is currently offering — for asserting what it does NOT offer (an
 * ID already used, or one that belongs to the other collection slot). The ids embed the server's
 * `evidence_type`, so match them as substrings, and put the whole list in the failure message: it is
 * the only record of what the backend actually served.
 */
export async function listEvidenceTypeRowIds(): Promise<string[]> {
  return (await evidenceTypeRows()).map((row) => row.id)
}

/**
 * Tap an EvidenceTypeList row. Rows carry testID `EvidenceTypeListItem-<evidence_type>` where the
 * evidence_type suffix is SERVER-PROVIDED — so match it as a case-insensitive substring of the row's
 * testID (`match`, e.g. `'Passport'`) rather than a guessed exact label. Requires exactly one match;
 * on zero or multiple it throws WITH the list of row testIDs found, so a mismatch is self-diagnosing
 * (the next run's error reveals the real evidence_type values to pin).
 *
 * Selecting a row PERSISTS the choice and pushes IDPhotoInformation — so a caller that stops here has
 * left an evidence entry with no photos, which is the app's "capture interrupted" state.
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
    // The list arrives on a push animation, so settle the row before tapping — a tap dispatched against
    // bounds the view has already moved past is silently dropped, and the flow blames the NEXT screen.
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
 * Wait for EvidenceCapture's shutter, and on failure say WHICH of the two very different causes it was.
 *
 * The screen's `self` is the shutter, which renders last: the MaskedCamera container mounts as soon as
 * the permission request settles, but the shutter waits on `useCameraDevice` resolving a device. So a
 * missing shutter means either the push never landed (container absent) or the camera never came up
 * (container present) — indistinguishable from the timeout alone, and the ambiguity is what makes this
 * failure expensive to read off a CI log.
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
 * Capture a document's photo(s). CAMERA-ONLY: on Sauce the supplied image is injected before the
 * shutter (RN camera feeds are unreliable — see `helpers/camera`); on a local real device the physical
 * camera captures whatever it sees (`injectPhoto` throws off-Sauce). Shutter → accept in PhotoReview,
 * repeating per side (1 for a passport, 2 for a licence — backend-driven) until the typed
 * EvidenceIDCollection form appears.
 *
 * `barcodeMasks` MUST cover any decodable barcode on the injected image: the document camera runs a
 * live code scanner behind the shutter, and on Android the injected frames feed it. An unmasked SIT
 * combo barcode gets "scanned", and in the non-BCSC flow the app then verifies it with the backend on
 * UsePhoto and — on a match — quietly resets the flow into card setup (observed: sees the template's
 * serial C26444539, authorizes THAT card, resumes at IDPhotoInformation, journey dead). iOS injection
 * never produces barcode scans, which is why this only ever broke Android.
 *
 * `retakeFirstSide` exercises PhotoReview's Retake before accepting: it pops back to the camera for the
 * SAME side, so the side is simply shot again. Nothing about the resulting evidence differs — the point
 * is that the discard-and-return path works — so it is an option here rather than a separate flow.
 */
async function capturePhotoIdDocument(
  image: string,
  barcodeMasks: readonly ImageMaskRegion[] = [],
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // The primer's CTA pushes EvidenceCapture — confirm the push actually landed rather than assuming it.
  // A tap dispatched while the screen is still transitioning gets swallowed on Android, and because the
  // element WAS found the tap reports success; the flow then waits out its whole timeout on the shutter
  // of a camera screen that was never opened, and blames the camera.
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
  // The document camera requests camera permission on first entry — accept it whenever it appears,
  // otherwise EvidenceCapture renders the PermissionDisabled fallback and MaskedCamera never mounts.
  // On later entries permission is long granted, but the capture session still has to restart — so
  // every entry gets the camera budget rather than a screen-transition one.
  await reachEvidenceCamera()
  if (isSauceLabs()) {
    await injectPhoto(image, {}, barcodeMasks) // padding may need tuning to the document mask
  }
  await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter — NOT tapToNavigate (not idempotent)
  await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Non-photo BCSC "additional ID", step one: from AdditionalIdentificationRequired, open the photo-ID
 * list. Separate from the capture because the list is where the non-photo escape hatch lives, and
 * because backing out of that hatch lands here again — so this is re-callable.
 */
export async function reachAdditionalPhotoIdList(): Promise<void> {
  // AdditionalIdentificationRequired's only testID is the generic `Continue` (shared by ~10 screens),
  // so wait for its UNIQUE heading to settle before tapping — otherwise a lingering `Continue` from the
  // previous screen can be tapped mid-transition and the flow never advances.
  const headingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "provide additional ID"'
    : 'android=new UiSelector().textContains("provide additional ID")'
  await $(headingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await AdditionalIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList
}

/**
 * Non-photo BCSC "additional ID", step two: pick the ID type and capture its photo(s), stopping ON the
 * typed EvidenceIDCollection form (its document number is submitted separately, by
 * {@link submitEvidenceIdCollection} — the gap between capture and number is itself a resumable state).
 * `evidenceMatch` is a case-insensitive substring of the target row's testID (server-provided; e.g.
 * `'Passport'`). Camera-only via {@link capturePhotoIdDocument}.
 */
export async function captureAdditionalPhotoId(
  user: TestUser,
  evidenceMatch: string,
  options: { retakeFirstSide?: boolean } = {}
): Promise<void> {
  await selectEvidenceType(evidenceMatch)
  // The card-back template carries the SIT combo barcode. The reroute-on-scan has only been observed
  // in the non-BCSC flow, but the code scanner runs behind every document capture — mask on principle.
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS, options)
}

/**
 * Fill an EvidenceIDCollection form — the typed document number, plus (first non-BCSC ID only) the
 * name + birthdate personal-info fields — then Continue.
 *
 * Every field is re-typed from scratch, so calling this again after a rejected submit replaces the
 * offending value rather than appending to it (the engine clears before typing, and the form clears a
 * field's error as soon as it changes).
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
 * Enter the non-BCSC branch: IdentitySelection `OtherID` → DualIdentificationRequired → the first-ID
 * EvidenceTypeList. Choosing OtherID sets the non-BCSC card process and discards any serial already
 * entered, so this is a one-way turn off the BCSC path.
 *
 * Stops AT the list — no camera and no document is committed — so it is also the cheap way to reach
 * the evidence screens on a session that never verifies.
 */
export async function chooseOtherIdPath(): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tapToNavigate('secondary') // OtherID → DualIdentificationRequired

  // DualIdentificationRequired's only CTA is the generic `Continue`; confirm by heading before tapping.
  const dualHeadingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "two government"'
    : 'android=new UiSelector().textContains("two government")'
  await $(dualHeadingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  // Safe to confirm-and-retry on the generic `Continue` here: EvidenceTypeList renders no Continue of
  // its own, so the button going away really does mean the push landed.
  await DualIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList (first ID)
}

/**
 * Non-BCSC path, first of the two required IDs: OtherID → the first-ID list → pick → capture, stopping
 * ON the typed form (which for this document also collects name + birthdate). `docMatch` is a
 * case-insensitive substring of the target row's testID. Camera-only via {@link capturePhotoIdDocument}.
 *
 * The card-back image carries the SIT combo barcode, and this is the flow where the app verifies a
 * scanned barcode with the backend on UsePhoto and reroutes on a match — so the barcode regions must be
 * masked out of the injection.
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
 * Non-BCSC path, second ID: pick → capture, stopping ON its typed form. Submitting that form (number
 * only — the personal info was collected with the first document) resumes to ResidentialAddress.
 *
 * The list this picks from is a DIFFERENT list from the first document's: the screen filters by
 * `collection_order` and hides anything already chosen, so the two slots genuinely offer different rows.
 */
export async function captureSecondNonBcscDocument(user: TestUser, docMatch: string): Promise<void> {
  await selectEvidenceType(docMatch)
  await capturePhotoIdDocument(user.selfieImage)
}

/**
 * Fill the ResidentialAddress form (non-BCSC only) and continue → the mandatory email step. Province
 * is a dropdown: tap it to open the modal, then pick British Columbia.
 *
 * This screen is why {@link BaseScreen.dismissKeyboard} no longer blind-taps on iOS: once the
 * postal-code field is focused, the province dropdown sits under the old tap point, so the "dismiss"
 * opened its modal and left Continue unreachable. Nothing here may dismiss the keyboard positionally.
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
 * Wait for the province dropdown's modal to close — the BC option exists only inside it, so its
 * disappearance is the signal. Asserted explicitly so a swallowed option tap is named here rather
 * than surfacing later as an unreachable postal-code field.
 */
async function expectProvinceDropdownClosed(): Promise<void> {
  const deadline = Date.now() + Timeouts.SCREEN_TRANSITION
  do {
    if (!(await ResidentialAddressScreen.isVisible('provinceBC'))) return
    await driver.pause(250)
  } while (Date.now() < deadline)
  throw new Error('The province dropdown did not close after selecting British Columbia')
}
