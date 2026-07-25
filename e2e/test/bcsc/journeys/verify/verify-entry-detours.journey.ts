import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import { chooseAddAccount, enterSerialManually, startVerification } from '../../../../src/flows/verify.js'
import { acceptSystemAlert } from '../../../../src/helpers/alerts.js'
import { BaseScreen } from '../../../../src/screens/core/BaseScreen.js'
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
} from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/** Engine handle for the one screen anchored on visible copy (EvidenceTypeList has no container testID). */
const engine = new BaseScreen()
/** A valid-format birthdate that does NOT match the photo card, to force the CSN/birthdate mismatch. */
const MISMATCH_DOB = '19800101'

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

  it('reveals manual serial entry behind the Scan camera gate and backs out', async () => {
    await IdentitySelectionScreen.tap('primary') // Scan → ScanSerial (auto-requests camera permission)
    await acceptSystemAlert()
    await ScanSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ScanSerialScreen.tap('primary') // EnterManually (pushes ManualSerial)
    await ManualSerialScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Both hops are pushes, so back out twice: ManualSerial → ScanSerial → IdentitySelection.
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
