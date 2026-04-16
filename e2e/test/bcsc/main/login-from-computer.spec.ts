/**
 * Login-from-computer e2e: mint a pairing code via a Node-side replay of
 * the BC Parks demo web flow (idsit.gov.bc.ca), then type it into BCSC and
 * verify PairingConfirmation renders.
 *
 * Covers ticket AC #3: Home → LogInFromComputer → ManualPairingCode →
 * enter code → Submit → PairingConfirmation.
 *
 * Preconditions: app is onboarded and resting on the Home tab. Spec is not
 * imported by full-regression.spec.ts yet — run standalone with --spec
 * while we validate the Node-fetch path.
 */
import { Timeouts } from '../../../src/constants.js'
import { fetchPairingCode } from '../../../src/helpers/pairing-code.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const Home = new BaseScreen(BCSC_TestIDs.Home)
const ManualPairing = new BaseScreen(BCSC_TestIDs.ManualPairingCode)
const PairingConfirmation = new BaseScreen(BCSC_TestIDs.PairingConfirmation)

describe('Login From Computer — pairing code minted in Node', () => {
  let pairingCode = ''

  before(async () => {
    await Home.waitFor('SettingsMenuButton', Timeouts.screenTransition)
    const session = await fetchPairingCode()
    pairingCode = session.pairingCode
    console.log(
      `[login-from-computer] minted pairing code ${pairingCode} for "${session.clientName}" (tx ${session.transactionId})`
    )
  })

  it('navigates from Home to ManualPairingCode via Log In From Computer', async () => {
    await Home.tap('LogInFromComputer')
    await ManualPairing.waitFor('PairingCodeInput')
  })

  it('submits the pairing code and verifies PairingConfirmation renders', async () => {
    await ManualPairing.type('PairingCodeInput', pairingCode, {
      tapFirst: true,
      characterByCharacter: true,
    })
    await ManualPairing.dismissKeyboard()
    await ManualPairing.tap('Submit')
    await PairingConfirmation.waitFor('Close', Timeouts.screenTransition)
  })

  it('closes the PairingConfirmation screen', async () => {
    await PairingConfirmation.tap('Close')
    await Home.waitFor('SettingsMenuButton', Timeouts.screenTransition)
  })
})
