import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import { chooseAddAccount, enterSerialManually, startVerification } from '../../../../src/flows/verify.js'
import { EnterBirthdateScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Verify journey: entry spine.
 *
 * Proves the reworked entry end-to-end with no card-type buttons: onboard (same session — the
 * VerifyPrompt only exists here) → Continue → AccountSetup → IdentitySelection `Scan` → past the
 * camera gate via `EnterManually` → serial typed → birthdate filled. It stops SHORT of the
 * birthdate submit: that fires the backend `authorizeDevice` (network, creates SIT device state),
 * which belongs to the verified card journeys. Everything here is deterministic and
 * backend-free except the terms-of-use fetch.
 *
 * A separate entry-detours journey extends this area.
 */
describe('Verify journey: entry spine', () => {
  before(() => {
    setTestUser(TestUsers.photo)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('continues into verification onto the account setup choice', async () => {
    await startVerification()
  })

  it('chooses Add Account and reaches identity selection', async () => {
    await chooseAddAccount()
  })

  it('passes the camera gate to manual serial entry and types the serial', async () => {
    await enterSerialManually(getTestUser())
  })

  it('fills the birthdate, stopping short of the authorize call', async () => {
    await EnterBirthdateScreen.fill('birthdate', getTestUser().dob, { tapFirst: true })
    await EnterBirthdateScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
