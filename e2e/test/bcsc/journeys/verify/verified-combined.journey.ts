import assert from 'node:assert/strict'
import { TestUsers, Timeouts } from '../../../../src/constants.js'
import { completeOnboarding } from '../../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  completeVerification,
  enterBirthdate,
  enterSerialManually,
  reachVerificationMethod,
  startVerification,
} from '../../../../src/flows/verify.js'
import { HomeScreen, ServicesScreen, SettingsScreen, TabBar, WalletScreen } from '../../../../src/screens/main.js'
import { VerificationMethodSelectionScreen } from '../../../../src/screens/verify.js'
import { getTestUser, setTestUser } from '../../../../src/support/context.js'

/**
 * Verified journey: combined card. A combined card uses the same BCSC-photo authorize process as the
 * photo card and its authorize response carries a verified email, so it resumes straight to method
 * selection with NO email step — the flow is the same as the photo journey, just a different card.
 * (The mandatory email step lives in the non-bcsc journey, where Skip is hidden.)
 *
 * One ordered session: onboard (same session — VerifyPrompt exists only here) → Continue → manual
 * serial → birthdate (authorizeDevice) → method selection → in-person approval → VerificationSuccess
 * → verified Home → verified tab nav + Services catalogue.
 *
 * Its distinct verified-account coverage (Contacts + AccountDetails) is appended here later. mocha bail
 * isolates any failure to this file; the other journeys still run.
 */
describe('Verified journey: combined card', () => {
  before(() => {
    setTestUser(TestUsers.combined)
  })

  it('onboards to the verify prompt', async () => {
    await completeOnboarding()
  })

  it('enters the combined serial and submits the birthdate', async () => {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(getTestUser())
    await enterBirthdate(getTestUser())
  })

  it('resumes to the verification method selection after authorizing', async () => {
    // Combined carries a card-provided email, so the flow skips EnterEmail and lands on method
    // selection directly (reachVerificationMethod tolerates either).
    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('completes verification in person and lands on verified Home', async () => {
    await completeVerification(getTestUser(), { method: 'in-person' })
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('confirms verified state: the account profile row now appears in Settings', async () => {
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    assert.ok(
      await SettingsScreen.isVisible('profile'),
      'the Settings Profile row is verified-gated and should be visible after verification'
    )
    await SettingsScreen.back.tap()
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  // Verified tab navigation + Services content. Unverified users are bounced to MainVerifyPrompt on the
  // Services tap (see unverified-main.journey.ts); once verified, the Services tab opens the real catalogue.
  it('verified: the Services tab opens the catalogue instead of the verify prompt', async () => {
    await TabBar.link('services')
    await ServicesScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // catalogue search field = loaded, not gated
  })

  it('verified: tab nav sweeps Services → Wallet → Home', async () => {
    await TabBar.link('wallet')
    // Identity verification issues no wallet credential, so the wallet is still the empty state; the
    // Credo agent boots for any authenticated user, so allow the cold-start budget.
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
