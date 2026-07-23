import type { TestUser } from '../constants.js'
import { Timeouts } from '../constants.js'
import { acceptSystemAlert } from '../helpers/alerts.js'
import { ApproveInPersonInput, approveInPersonRequest } from '../helpers/approval.js'
import { injectPhoto } from '../helpers/camera.js'
import { getEmailConfirmationCode, getTempEmailAddress } from '../helpers/email.js'
import { isSauceLabs } from '../helpers/sauce.js'
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
 * parameterized `reachVerifyStep`. `completeVerification(user, {method: 'in-person'})` then drives the
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
 * OS camera dialog when it appears; no-op when permission is already granted) → `EnterManually` →
 * ManualSerial → serial typed → EnterBirthdate. Card type is derived later, by `authorizeDevice`
 * at the birthdate submit.
 */
export async function enterSerialManually(user: TestUser): Promise<void> {
  await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IdentitySelectionScreen.tap('primary')
  await acceptSystemAlert()
  await ScanSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await ScanSerialScreen.tap('primary')
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
 * Dump the first several visible text strings on the current screen — makes "unexpected screen"
 * failures self-diagnosing by revealing which screen we actually landed on.
 */
async function describeCurrentScreen(): Promise<string> {
  const selector = driver.isIOS
    ? '-ios predicate string:type == "XCUIElementTypeStaticText"'
    : 'android=new UiSelector().className("android.widget.TextView")'
  const els = await $$(selector)
  const texts: string[] = []
  for (const el of els) {
    const t = driver.isIOS ? await el.getAttribute('label').catch(() => null) : await el.getText().catch(() => null)
    if (t) {
      texts.push(t)
    }
    if (texts.length >= 8) {
      break
    }
  }
  return texts.length ? texts.join(' | ') : '(no visible text found)'
}

/**
 * From the post-authorize state (birthdate submitted), reach VerificationMethodSelection. For a
 * card-tap flow the address step is auto-satisfied once the device is authorized; the email step only
 * appears when the card supplied no verified email — detect it by its HEADING (the input's marker is
 * less reliable) and skip it (BCSC cards allow skipping). On an unexpected screen the error reports
 * what is actually on screen.
 */
export async function reachVerificationMethod(): Promise<void> {
  const emailHeadingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "email address"'
    : 'android=new UiSelector().textContains("email address")'
  const deadline = Date.now() + Timeouts.APP_LAUNCH
  for (;;) {
    if (await VerificationMethodSelectionScreen.isPresent(1_000)) {
      return
    }
    if (await $(emailHeadingSelector).isDisplayed().catch(() => false)) {
      await EnterEmailScreen.tap('secondary') // SkipEmail (BCSC flow)
      await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
      return
    }
    if (Date.now() > deadline) {
      throw new Error(
        `reachVerificationMethod: neither VerificationMethodSelection nor EnterEmail appeared. On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}

/**
 * Complete verification via the IN-PERSON method — the CI default: no in-app camera, approved by the
 * real SiteMinder/IDcheck SIT flow (`approveInPersonRequest`; needs `SM_USER`/`SM_PASSWORD` and an
 * allowlisted runner IP). Assumes VerificationMethodSelection is showing. Reads the on-screen
 * confirmation code, drives the approval, then Complete → VerificationSuccess → Home (verified).
 *
 * Only `in-person` is CI-completable; the send-video / live-call methods enter camera screens and
 * live in the manual suite.
 */
export async function completeVerification(
  user: TestUser,
  options: { method: 'in-person' | 'send-video' | 'live-call' }
): Promise<void> {
  if (options.method !== 'in-person') {
    throw new Error(`completeVerification: only 'in-person' is CI-completable (got '${options.method}')`)
  }

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
 * Capture a document's photo(s). CAMERA-ONLY: on Sauce the supplied image is injected before the
 * shutter (RN camera feeds are unreliable — see `helpers/camera`); on a local real device the physical
 * camera captures whatever it sees (`injectPhoto` throws off-Sauce). Shutter → accept in PhotoReview,
 * repeating per side (1 for a passport, 2 for a licence — backend-driven) until the typed
 * EvidenceIDCollection form appears.
 */
async function capturePhotoIdDocument(image: string): Promise<void> {
  await IDPhotoInformationScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  await IDPhotoInformationScreen.tap('primary') // → EvidenceCapture (camera)
  // The document camera requests camera permission on first entry — accept it, otherwise
  // EvidenceCapture renders the PermissionDisabled fallback and the MaskedCamera never mounts.
  await acceptSystemAlert()

  for (let side = 0; side < 2; side++) {
    await EvidenceCaptureScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    if (isSauceLabs()) {
      await injectPhoto(image, {}) // padding may need tuning to the document mask
    }
    await EvidenceCaptureScreen.tap('primary') // MaskedCamera shutter
    await PhotoReviewScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await PhotoReviewScreen.tap('primary') // UsePhoto
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
  await AdditionalIdentificationRequiredScreen.tap('primary') // Continue → EvidenceTypeList
  await selectEvidenceType(evidenceMatch)
  await capturePhotoIdDocument(user.cardScanImage)
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
  await IdentitySelectionScreen.tap('secondary') // OtherID → DualIdentificationRequired

  // DualIdentificationRequired's only CTA is the generic `Continue`; confirm by heading before tapping.
  const dualHeadingSelector = driver.isIOS
    ? '-ios predicate string:label CONTAINS "two government"'
    : 'android=new UiSelector().textContains("two government")'
  await $(dualHeadingSelector).waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  await DualIdentificationRequiredScreen.tap('primary') // Continue → EvidenceTypeList (first ID)

  // First ID — captured + typed WITH name/birthdate.
  await selectEvidenceType(firstDocMatch)
  await capturePhotoIdDocument(user.cardScanImage)
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
