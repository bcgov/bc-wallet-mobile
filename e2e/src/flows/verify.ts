import type { TestUser } from '../constants.js'
import { COMBO_CARD_BARCODE_MASKS, Timeouts } from '../constants.js'
import { ApproveInPersonInput, approveInPersonRequest } from '../helpers/approval.js'
import type { ImageMaskRegion } from '../helpers/camera.js'
import { injectPhoto } from '../helpers/camera.js'
import { getEmailConfirmationCode, getTempEmailAddress } from '../helpers/email.js'
import { swipeUpBy } from '../helpers/gestures.js'
import { isSauceLabs } from '../helpers/sauce.js'
import { describeCurrentScreen, reachCameraScreen } from '../helpers/screens.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { HomeScreen } from '../screens/main.js'
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
      await EnterEmailScreen.tap('secondary') // SkipEmail (BCSC flow)
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
 * Drive the full email-verification step with a throwaway inbox: enter a temp address, read the
 * emailed 6-digit code, confirm it, and continue past EmailVerified to VerificationMethodSelection.
 * The email step is MANDATORY in the non-BCSC flow (Skip is hidden there and a non-BCSC user has no
 * card-provided email), so this belongs to the non-bcsc journey. BCSC photo/combined cards carry a
 * verified email and skip the step — those use `reachVerificationMethod` instead.
 */
export async function verifyEmailWithTempInbox(): Promise<void> {
  const { email, token } = await getTempEmailAddress()

  await EnterEmailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await EnterEmailScreen.fill('email', email, { tapFirst: true })
  await engine.dismissKeyboard()
  await EnterEmailScreen.tapWhenEnabled('primary') // Continue → createEmailVerification → EmailConfirmation

  await EmailConfirmationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  const code = await getEmailConfirmationCode(token)
  await EmailConfirmationScreen.fill('code', code, { tapFirst: true })
  await engine.dismissKeyboard()
  await EmailConfirmationScreen.tapWhenEnabled('primary') // Continue → sendCode → RESET to EmailVerified

  // EmailVerified's only testID is the shared Continue, so confirm arrival by its title copy before
  // tapping through — its Continue RESETS to VerificationMethodSelection.
  const verifiedTitle = await engine.findByText('Your email has been verified')
  await verifiedTitle.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await EmailVerifiedScreen.tap('primary')

  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Tap an EvidenceTypeList row. Rows carry testID `EvidenceTypeListItem-<evidence_type>` where the
 * evidence_type suffix is SERVER-PROVIDED — so match it as a case-insensitive substring of the row's
 * testID (`match`, e.g. `'Passport'`) rather than a guessed exact label. Requires exactly one match;
 * on zero or multiple it throws WITH the list of row testIDs found, so a mismatch is self-diagnosing
 * (the next run's error reveals the real evidence_type values to pin).
 */
async function selectEvidenceType(match: string): Promise<void> {
  const rowsSelector = driver.isIOS
    ? '-ios predicate string:name CONTAINS "EvidenceTypeListItem"'
    : 'android=new UiSelector().resourceIdMatches(".*EvidenceTypeListItem.*")'
  await $(rowsSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })

  const attr = driver.isIOS ? 'name' : 'resource-id'
  const rows = await $$(rowsSelector)
  const needle = match.toLowerCase()
  const ids: string[] = []
  let target: WebdriverIO.Element | null = null
  let count = 0
  for (const el of rows) {
    const id = (await el.getAttribute(attr).catch(() => null)) ?? ''
    ids.push(id)
    if (id.toLowerCase().includes(needle)) {
      count += 1
      target = el
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
 */
async function capturePhotoIdDocument(image: string, barcodeMasks: readonly ImageMaskRegion[] = []): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  // The primer's CTA pushes EvidenceCapture — confirm the push actually landed rather than assuming it.
  // A tap dispatched while the screen is still transitioning gets swallowed on Android, and because the
  // element WAS found the tap reports success; the flow then waits out its whole timeout on the shutter
  // of a camera screen that was never opened, and blames the camera.
  await IDPhotoInformationScreen.tapToNavigate('primary')

  for (let side = 0; side < 2; side++) {
    // The document camera requests camera permission on first entry — accept it whenever it appears,
    // otherwise EvidenceCapture renders the PermissionDisabled fallback and MaskedCamera never mounts.
    // On the second side permission is long granted, but the capture session still has to restart — so
    // both sides get the camera budget rather than a screen-transition one.
    await reachEvidenceCamera()
    if (isSauceLabs()) {
      await injectPhoto(image, {}, barcodeMasks) // padding may need tuning to the document mask
    }
    await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter — NOT tapToNavigate (not idempotent)
    await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await PhotoReviewScreen.tapToNavigate('primary') // UsePhoto → next side or the typed form
    if (await EvidenceIDCollectionScreen.isPresent(Timeouts.SCREEN_TRANSITION)) {
      return
    }
  }
  await EvidenceIDCollectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Non-photo BCSC "additional ID": from AdditionalIdentificationRequired, add one extra photo ID — pick
 * its type, capture its photo, and type its document number — landing on the post-document resume
 * (EnterEmail, skippable for a BCSC card). `evidenceMatch` is a case-insensitive substring of the
 * target EvidenceTypeList row testID (server-provided; e.g. `'Passport'`). Camera-only via
 * {@link capturePhotoIdDocument}.
 */
export async function addAdditionalPhotoId(user: TestUser, evidenceMatch: string): Promise<void> {
  // AdditionalIdentificationRequired's only testID is the generic `Continue` (shared by ~10 screens),
  // so wait for its UNIQUE heading to settle before tapping — otherwise a lingering `Continue` from the
  // previous screen can be tapped mid-transition and the flow never advances.
  const headingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "provide additional ID"'
    : 'android=new UiSelector().textContains("provide additional ID")'
  await $(headingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await AdditionalIdentificationRequiredScreen.tapToNavigate('primary') // Continue → EvidenceTypeList
  await selectEvidenceType(evidenceMatch)
  // The card-back template carries the SIT combo barcode. The reroute-on-scan has only been observed
  // in the non-BCSC flow, but the code scanner runs behind every document capture — mask on principle.
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS)
  await EvidenceIDCollectionScreen.fill('documentNumber', user.documentNumber, { tapFirst: true })
  await engine.dismissKeyboard()
  await EvidenceIDCollectionScreen.tapWhenEnabled('primary') // EvidenceIDCollectionContinue
}

/**
 * Fill an EvidenceIDCollection form — the typed document number, plus (first non-BCSC ID only) the
 * name + birthdate personal-info fields — then Continue.
 */
async function fillEvidenceIdCollection(
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
 * Non-BCSC path: from IdentitySelection, choose OtherID and provide TWO government IDs (each captured
 * then typed), landing on ResidentialAddress. `firstDocMatch`/`secondDocMatch` are case-insensitive
 * substrings of the two EvidenceTypeList row testIDs; the first document also collects name +
 * birthdate. Camera-only via {@link capturePhotoIdDocument}.
 */
export async function collectNonBcscEvidence(
  user: TestUser,
  firstDocMatch: string,
  secondDocMatch: string
): Promise<void> {
  if (user.flow !== 'non-bcsc') {
    throw new Error(`collectNonBcscEvidence requires a non-bcsc TestUser (got '${user.flow}')`)
  }
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

  // First ID — captured + typed WITH name/birthdate. The card-back image carries the SIT combo
  // barcode, and this is the flow where the app verifies a scanned barcode with the backend on
  // UsePhoto and reroutes on a match — so the barcode regions must be masked out of the injection.
  await selectEvidenceType(firstDocMatch)
  await capturePhotoIdDocument(user.cardScanImage, COMBO_CARD_BARCODE_MASKS)
  await fillEvidenceIdCollection(user.primaryDocumentNumber, {
    lastName: user.lastName,
    firstName: user.firstName,
    dob: user.dob,
  })

  // Second ID — captured + typed (number only); its save resumes to ResidentialAddress.
  await selectEvidenceType(secondDocMatch)
  await capturePhotoIdDocument(user.selfieImage)
  await fillEvidenceIdCollection(user.documentNumber)
}

/**
 * Fill the ResidentialAddress form (non-BCSC only) and continue → the mandatory email step. Province
 * is a dropdown: tap it to open the modal, then pick British Columbia.
 */
export async function fillResidentialAddress(): Promise<void> {
  await ResidentialAddressScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.fill('streetAddress1', '123 Main St', { tapFirst: true })
  await ResidentialAddressScreen.fill('city', 'Victoria', { tapFirst: true })
  await engine.dismissKeyboard()

  await ResidentialAddressScreen.link('province')
  await ResidentialAddressScreen.waitFor('provinceBC', Timeouts.SCREEN_TRANSITION)
  await ResidentialAddressScreen.link('provinceBC')

  await ResidentialAddressScreen.fill('postalCode', 'V8W 2Y2', { tapFirst: true })
  await engine.dismissKeyboard()
  await ResidentialAddressScreen.tapWhenEnabled('primary') // ResidentialAddressContinue
}
