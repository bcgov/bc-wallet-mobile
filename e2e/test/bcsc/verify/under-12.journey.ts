import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  reachVerificationMethod,
  startVerification,
} from '../../../src/flows/verify.js'
import { HomeScreen, SettingsScreen, TransferAgeRestrictionScreen } from '../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../src/support/context.js'

/**
 * Verified journey: under-12 account. Same photo-card path as `verified-photo` (serial + dob, no camera),
 * driven by a minor's persona to reach the two age-dependent behaviours — neither of which has a UI flow
 * of its own, and neither of which any other journey touches.
 *
 * 1. The restricted method set is BACKEND-driven: method selection renders whatever the authorize response
 *    returned, unfiltered, so only an end-to-end run can prove a minor is offered in-person alone.
 * 2. The transfer age gate is CLIENT-side, untested in unit tests, and fails open — an unparseable
 *    `account.birthdate` sends a minor to the transfer QR — so this also guards that date-format contract.
 *
 * One ordered session: onboard → Continue → manual serial → birthdate submit (`authorizeDevice`) → method
 * selection (restricted-set assert) → in-person completion via the real SiteMinder/IDcheck approval
 * (`SM_USER`/`SM_PASSWORD` on an allowlisted runner) → verified Home → Settings → Add device.
 */
describe('Verified journey: under-12 account', () => {
  before(() => {
    setTestUser(TestUsers.u12)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('offers in-person only — the server withholds both video methods for a minor', async () => {
    await reachVerificationMethod()
    // `self` is the HoursOfService heading, which renders unconditionally, so arrival is assertable even
    // when a single method — or none — is offered.
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)

    // Both failures below are FINDINGS, not test bugs — do not relax these asserts to make them pass.
    // In-person missing means the authorize response carried only `self` (or nothing), which this screen
    // renders as a dead end with no actionable control at all.
    assert.ok(
      await VerificationMethodSelectionScreen.isVisible('inPerson'),
      'in-person is the only method a minor should be offered, so its absence means the authorize response offered none — report it, the screen has no other control'
    )
    assert.equal(
      await VerificationMethodSelectionScreen.isVisible('sendVideo'),
      false,
      'send-video should not be offered to an under-12 account — if it renders, the environment is serving an unrestricted option set'
    )
    assert.equal(
      await VerificationMethodSelectionScreen.isVisible('videoCall'),
      false,
      'live call should not be offered to an under-12 account — if it renders, the environment is serving an unrestricted option set'
    )
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser())
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('blocks add-device behind the age restriction instead of the transfer QR', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // The AddDevice row is verified-gated, so reaching it also re-proves the account flipped to verified.
    // An adult lands on the QR flow here (asserted by the combined journey); a minor must not.
    await SettingsScreen.link('addDevice')
    await TransferAgeRestrictionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await TransferAgeRestrictionScreen.back.tap()
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
