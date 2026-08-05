import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import { chooseAddAccount, enterSerialManually, startVerification } from '../../../src/flows/verify.js'
import { dismissSystemAlert } from '../../../src/helpers/alerts.js'
import { BaseScreen } from '../../../src/screens/core/BaseScreen.js'
import {
  AccountSetupScreen,
  DualIdentificationRequiredScreen,
  EnterBirthdateScreen,
  IdentitySelectionScreen,
  ManualSerialScreen,
  ScanSerialScreen,
  TransferAccountInstructionsScreen,
  VerificationCardErrorScreen,
  VerifyWebViewScreen,
} from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/** Engine handle for the one screen anchored on visible copy (EvidenceTypeList has no container testID). */
const engine = new BaseScreen()
/** A valid-format birthdate that does NOT match the photo card, to force the CSN/birthdate mismatch. */
const MISMATCH_DOB = '19800101'
/** Shorter than the serial schema's 3-character minimum, so it trips the format rule rather than the empty one. */
const TOO_SHORT_SERIAL = 'AB'
/** ManualSerial's two reachable inline errors (`BCSC.ManualSerial.EmptySerialError` / `FormatError`).
 *  Asserted verbatim: only the message tells the two validation rules apart. */
const EMPTY_SERIAL_ERROR = 'Required'
const SERIAL_FORMAT_ERROR = 'Enter a valid card serial number'

/**
 * Verify journey: entry detours — the cheap, no-verification-completed browse of the verify entry
 * stack (the detours formerly bundled into the monolithic SetupSteps-anchored interaction-sweep spec).
 * One `it` per detour so a failure isolates to that detour (mocha bail skips the rest of THIS file; other
 * journeys still run). Backend traffic is limited to the terms fetch, the accepted-documents webview, and
 * ONE deliberate mismatched-serial authorize (a real CSN + a wrong birthdate) that fails fast into the
 * VerificationCardError screen — no verification is ever completed here.
 *
 * Structure avoids ambiguous back-navigation: the AccountSetup detour is a self-contained round-trip;
 * the serial branch backs out through its push stack (ManualSerial → ScanSerial → IdentitySelection);
 * the Other-ID branch chains FORWARD (DualId webview → EvidenceTypeList) with no deep back-out.
 *
 * The camera permission is REFUSED at the first ScanSerial, which is why that checkpoint comes before
 * everything else on the serial branch: the answer is one-way within a session (iOS never re-prompts),
 * so a grant anywhere earlier would make the refused body unreachable. It costs the later checkpoints
 * nothing — `EnterManually` is rendered by both the camera body and the permission fallback, so the
 * CI path around the camera works either way (which is also why this now runs on both platforms
 * rather than iOS only: nothing here depends on a live camera coming up).
 *
 * Anchors + navigation verified against app source (main): AccountSetup Add/Transfer
 * (AddAccount/TransferAccount → TransferAccountInstructions), TransferInstructions `ScanQRCode`,
 * IdentitySelection Scan/OtherID (→ ScanSerial / DualIdentificationRequired), ScanSerial `EnterManually`
 * (PUSHES ManualSerial), DualId `SeeAcceptedID` → VerifyWebView and `Continue` → EvidenceTypeList, and
 * the shared header `Back` (the progress-header screens keep the default headerLeft). Two things were
 * deliberately left out because they don't exist on this path: the help-menu 'Learn more' webview (its
 * ListButton has no testID and a non-breaking-space a11y label — the seeAcceptedId round-trip already
 * covers an in-app webview) and EvidenceTypeList 'Show more options' (renders only for the non-photo
 * BCSC path, `photoFilter==='photo'`, not the non-BCSC first-ID list — it belongs to the non-photo
 * card journey).
 */
describe('Verify journey: entry detours', () => {
  before(() => {
    setTestUser(TestUsers.photo)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('continues into verification onto the account setup choice', async () => {
    await startVerification()
    await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('browses the transfer-account detour and backs out', async () => {
    await AccountSetupScreen.tap('secondary') // TransferAccount → TransferAccountInstructions
    await TransferAccountInstructionsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // ScanQRCode button
    await TransferAccountInstructionsScreen.back.tap()
    await AccountSetupScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('enters Add Account and reaches identity selection', async () => {
    await chooseAddAccount()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('offers manual entry when the camera permission is refused', async () => {
    await IdentitySelectionScreen.tapToNavigate('primary') // Scan → ScanSerial (auto-requests the camera)
    // REFUSING is a one-way door for the session (iOS never re-prompts), so it has to be the first
    // thing the camera screen is asked, before any checkpoint grants it.
    await dismissSystemAlert(Timeouts.SCREEN_TRANSITION)
    // `self` cannot tell the two bodies apart — EnterManually renders in both, which is what keeps the
    // CI path working either way. `openSettings` exists only in the refused one. It is never tapped:
    // it hands the session off to the OS settings app.
    await ScanSerialScreen.waitFor('openSettings', Timeouts.SCREEN_TRANSITION)
    await ScanSerialScreen.tapToNavigate('primary') // EnterManually (pushes ManualSerial)
    await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('rejects an empty and a malformed serial with inline errors', async () => {
    // Continue is always enabled here — validation runs on press, so both cases are a press away.
    await ManualSerialScreen.tapWhenEnabled('primary') // empty field
    assert.equal(await ManualSerialScreen.read('error'), EMPTY_SERIAL_ERROR)

    await ManualSerialScreen.fill('serial', TOO_SHORT_SERIAL, { tapFirst: true })
    await engine.dismissKeyboard()
    await ManualSerialScreen.tapWhenEnabled('primary')
    assert.equal(await ManualSerialScreen.read('error'), SERIAL_FORMAT_ERROR)
    // The third rule the schema carries — over 15 characters — is unreachable from the UI: the input
    // sets maxLength 15, so those keystrokes never arrive.
  })

  it('backs out of the serial branch to identity selection', async () => {
    // Both hops were pushes, so back out twice: ManualSerial → ScanSerial → IdentitySelection.
    await ManualSerialScreen.back.tap()
    await ScanSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ScanSerialScreen.back.tap()
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('rejects a mismatched serial + birthdate and offers Try Another', async () => {
    // The one backend authorize on this journey: a REAL card serial + a deliberately WRONG birthdate.
    // authorizeDevice rejects the CSN/birthdate match; that error is unhandled (a handled AppError would
    // stay on EnterBirthdate), so the submit navigates to VerificationCardError (MismatchedSerial).
    await enterSerialManually(getTestUser()) // real serial → EnterBirthdate (camera alert already granted)
    await EnterBirthdateScreen.fill('birthdate', MISMATCH_DOB, { tapFirst: true })
    await engine.dismissKeyboard()
    await EnterBirthdateScreen.tapWhenEnabled('primary') // authorizeDevice → rejects
    await VerificationCardErrorScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // TryAnother marker
    await VerificationCardErrorScreen.tap('primary') // Try Another → back to IdentitySelection
    await IdentitySelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('opens the Other-ID accepted-documents webview and returns', async () => {
    await IdentitySelectionScreen.tap('secondary') // OtherID → DualIdentificationRequired
    // DualId's only CTA is the generic Continue, so anchor on its `seeAcceptedId` link testID (which is
    // also the webview trigger) rather than the heading copy.
    await DualIdentificationRequiredScreen.waitFor('seeAcceptedId', Timeouts.SCREEN_TRANSITION)
    await DualIdentificationRequiredScreen.link('seeAcceptedId') // → VerifyWebView
    await driver.pause(Timeouts.BROWSER_HANDOFF_PAUSE_MS)
    await VerifyWebViewScreen.back.tap()
    await DualIdentificationRequiredScreen.waitFor('seeAcceptedId', Timeouts.SCREEN_TRANSITION)
  })

  it('continues into the non-BCSC evidence-type list (first ID)', async () => {
    // Chains forward from DualIdentificationRequired (still shown from the previous checkpoint).
    await DualIdentificationRequiredScreen.tap('primary') // Continue → EvidenceTypeList (NonBCSC first ID)
    // No container testID here; confirm arrival by the plain-text heading (regular spaces, unlike the
    // menu's a11y labels, so findByText matches).
    const listHeading = await engine.findByText('Choose your first ID')
    await listHeading.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  })
})
